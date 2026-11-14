# SomaSense: Code Review (Senior → Junior)

> [!NOTE]
> **Zakres:** przeczytałem całe repozytorium, czyli 8 modułów backendu, 11 plików frontendu, 9 plików testów, CI, skrypty, pliki instrukcji dla agentów i historię gita (5 commitów). Testy backendu uruchomiłem lokalnie: **70 passed** (Python 3.13, fastapi 0.129.0, SQLAlchemy 2.0.54).
> **Czego nie zweryfikowałem:** `npm run lint` i `npm run build`, bo brak `frontend/node_modules`, a środowisko było offline. Nie uruchamiałem też `pip-audit`, `bandit`, `ruff` ani `mypy`, bo nie są zainstalowane ani skonfigurowane w projekcie.
> Uwaga do briefu: frontend nie jest w czystym JS, tylko w **TypeScript** (`strict: true`). Oceniam więc TS, a nie „brak typowania”.

---

## 1. Podsumowanie

SomaSense to działający, przemyślany w ogólnym kształcie prototyp: backend ma sensowne fundamenty bezpieczeństwa (bcrypt, wyrównywanie czasu logowania, odwoływanie tokenów przez `jti`, CORS z listą originów, `pydantic-settings`), a 70 zielonych testów z izolowaną bazą in-memory to rzadkość u Juniora. Dojrzałość oceniam na **„zaawansowany prototyp”, jeszcze nie produkcja**. Największe ryzyko to **XSS**: markdown wygenerowany przez LLM trafia przez `marked` do `dangerouslySetInnerHTML` bez sanitizacji, a token JWT leży w `localStorage`. Drugi problem to **brak twardych granic po stronie API**. Endpointy AI nie mają rate limitu, pola tekstowe idące do promptu nie mają limitów długości, a odpowiedzi nie mają `response_model`. Do tego dochodzą **błędy poprawności niewidoczne w testach**: prompt dostaje literały `None`, stan magazynu po zużyciu nie jest aktualizowany w UI (funkcja `CONSUMPTION_STRUCTURE` / `/items/consume` nie jest podłączona), a błędy 422 wyświetlają się jako `[object Object]`. Wyraźnie widać wzorzec „security theater”: są „testy penetracyjne”, które tylko wypisują `print`, i nagłówki bezpieczeństwa na JSON API, a brakuje rzeczy podstawowych (sanitizacja, migracje, schematy odpowiedzi). **Backend jest w wyraźnie lepszym stanie niż frontend.** Integracja leży pośrodku: działa, ale opiera się na ręcznie pisanych, rozjechanych typach.

---

## 2. Dobre praktyki

| Warstwa | Co | Gdzie | Dlaczego to wartościowe |
|---|---|---|---|
| [Backend] | Ochrona przed enumeracją użytkowników przez pomiar czasu: weryfikacja hasha `DUMMY_PASSWORD_HASH`, gdy użytkownik nie istnieje | [main.py#L145-L147](file:///Users/rafalmadej/SomaSens/backend/main.py#L145-L147), [auth.py#L28](file:///Users/rafalmadej/SomaSens/backend/auth.py#L28) | Bez tego atakujący po samym czasie odpowiedzi rozpozna, które e-maile są zarejestrowane. Do tego jest test: `test_login_verifies_dummy_hash_for_unknown_user`. |
| [Backend] | JWT z `iss`/`aud`/`jti`/`iat`, jawne `algorithms=[ALGORITHM]`, odwołanie tokenu przy wylogowaniu i sprzątanie wygasłych wpisów | [auth.py#L46-L99](file:///Users/rafalmadej/SomaSens/backend/auth.py#L46-L99) | Jawna lista algorytmów zamyka atak typu `alg=none` lub podmianę algorytmu. Wylogowanie faktycznie unieważnia token po stronie serwera. |
| [Backend] | Limit bajtów hasła 72 (ograniczenie bcrypt), walidowany po bajtach UTF-8, a nie po znakach | [auth.py#L31-L35](file:///Users/rafalmadej/SomaSens/backend/auth.py#L31-L35) | bcrypt po cichu ucina dane powyżej 72 B. Mało kto o tym pamięta. |
| [Backend] | Konfiguracja przez `pydantic-settings` z `lru_cache`, a `jwt_secret_key` jest wymagany i ma `min_length=32`. Do tego fail-fast, gdy w `.env` zostanie wartość z szablonu | [config.py](file:///Users/rafalmadej/SomaSens/backend/config.py), [auth.py#L23-L24](file:///Users/rafalmadej/SomaSens/backend/auth.py#L23-L24) | Aplikacja nie wystartuje ze słabym ani domyślnym sekretem. |
| [Backend] | Endpointy jako `def` (nie `async def`) przy synchronicznym SQLAlchemy i `requests` | cały [main.py](file:///Users/rafalmadej/SomaSens/backend/main.py) | To **poprawna** decyzja: FastAPI uruchamia je w threadpoolu, więc 120-sekundowe wywołanie Ollamy nie blokuje event loopa. Agenci AI często robią tu `async def` z blokującym I/O. |
| [Backend] | Każde zapytanie filtruje po `owner_id`, a próba dostępu do cudzego rekordu kończy się 404 (nie 403) | [main.py#L214-L225](file:///Users/rafalmadej/SomaSens/backend/main.py#L214-L225) | Ochrona przed IDOR, która nie zdradza, czy obiekt istnieje. Pokrywa to test `test_access_other_user_items`. |
| [Backend] | `/items/consume` pobiera wszystkie produkty jednym zapytaniem `IN (...)`, a nie w pętli | [main.py#L241-L252](file:///Users/rafalmadej/SomaSens/backend/main.py#L241-L252) | Unikasz problemu N+1. |
| [Backend] | Kontekst dla LLM jest ograniczony (100 produktów, 30 aktywności) i priorytetyzowany po dacie ważności. Paginacja `limit`/`offset` z `le=250` | [main.py#L25-L28](file:///Users/rafalmadej/SomaSens/backend/main.py#L25-L28), [main.py#L424-L430](file:///Users/rafalmadej/SomaSens/backend/main.py#L424-L430) | Rozmiar promptu i odpowiedzi nie rośnie bez końca razem z danymi użytkownika. |
| [Backend] | `ai_service._generate`: timeout, `raise_for_status`, walidacja kształtu odpowiedzi, własny wyjątek `LocalModelError` z `from exc` i mapowanie na 503 | [ai_service.py#L16-L49](file:///Users/rafalmadej/SomaSens/backend/ai_service.py#L16-L49) | Granica z zewnętrzną usługą jest szczelna, a w łańcuchu wyjątków zostaje informacja o przyczynie. |
| [Backend] | Prompty wydzielone do `prompts.py` | [prompts.py](file:///Users/rafalmadej/SomaSens/backend/prompts.py) | Dobra separacja: prompty da się testować jednostkowo (choć na razie nikt tego nie robi, patrz sekcja 3). |
| [Backend] | Testy: SQLite in-memory + `StaticPool`, `dependency_overrides[get_db]`, mock na granicy `ai_service`, testy paginacji, izolacji użytkowników, odwołania tokenu i limitów kontekstu AI | [conftest.py#L26-L58](file:///Users/rafalmadej/SomaSens/tests/conftest.py#L26-L58), [test_ai_endpoints.py](file:///Users/rafalmadej/SomaSens/tests/test_ai_endpoints.py) | Szybkie i deterministyczne testy, które nie wołają prawdziwego LLM. |
| [Frontend] | `strict: true`, `noUnusedLocals`, `verbatimModuleSyntax`, ESLint z `eslint-plugin-react-hooks` | [tsconfig.app.json](file:///Users/rafalmadej/SomaSens/frontend/tsconfig.app.json), [eslint.config.js](file:///Users/rafalmadej/SomaSens/frontend/eslint.config.js) | Solidna siatka bezpieczeństwa na błędy agenta. |
| [Frontend] | Jedna warstwa API (`api.ts`), funkcyjne aktualizacje stanu (`setItems(curr => ...)`), stabilne `key={item.id}` | [api.ts](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts), [Pantry.tsx#L43-L45](file:///Users/rafalmadej/SomaSens/frontend/src/components/Pantry.tsx#L43-L45) | Komponenty nie składają URL-i same. Brak problemów z nieaktualnymi domknięciami (stale closures) przy dopisywaniu stron. |
| [Frontend] | Wylogowanie najpierw woła `/auth/logout`, a lokalne usunięcie tokenu działa nawet przy błędzie sieci | [api.ts#L57-L72](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L57-L72) | Poprawna kolejność i sensowny komentarz („why”, nie „what”). |
| [Integracja] | CORS z jawną listą originów, metod i nagłówków, bez `"*"` | [main.py#L39-L47](file:///Users/rafalmadej/SomaSens/backend/main.py#L39-L47) | Brak klasycznego błędu `allow_origins=["*"]` + `allow_credentials=True`. |
| [DevOps] | CI na PR: pytest + `npm ci` + lint + build; `.gitignore` obejmuje `.env*`, `*.db`, venvy; `.env.template` z instrukcją generowania sekretu | [ci.yml](file:///Users/rafalmadej/SomaSens/.github/workflows/ci.yml), [.gitignore](file:///Users/rafalmadej/SomaSens/.gitignore), [.env.template](file:///Users/rafalmadej/SomaSens/.env.template) | Przejrzałem historię gita: brak sekretów w repo. Baza nie jest commitowana. |
| [DevOps] | `run_app.sh`: sprawdza port i venv, zakłada `trap` na sprzątanie procesów, monitoruje oba procesy | [run_app.sh](file:///Users/rafalmadej/SomaSens/run_app.sh) | Nowa osoba uruchamia całość jedną komendą. |
| [Proces] | Pliki instrukcji dla agenta istnieją, a `copilot-instructions.md` jest konkretny (komendy, kontrakt paginacji, wartości enumów, zasada `owner_id`) | [copilot-instructions.md](file:///Users/rafalmadej/SomaSens/.github/copilot-instructions.md) | Tak powinien wyglądać kontekst dla agenta: fakty i ograniczenia, a nie marketing. |

---

## 3. Źle zastosowane praktyki i antywzorce

### 3.1 Bezpieczeństwo

| Warstwa | Problem | Lokalizacja | Dlaczego to źle | Priorytet | Poprawka |
|---|---|---|---|---|---|
| Frontend | **Niesanityzowany HTML z LLM w `dangerouslySetInnerHTML`** | [AIAssistant.tsx#L115-L117](file:///Users/rafalmadej/SomaSens/frontend/src/components/AIAssistant.tsx#L115-L117), [#L383-L386](file:///Users/rafalmadej/SomaSens/frontend/src/components/AIAssistant.tsx#L383-L386), [Home.tsx#L22-L24](file:///Users/rafalmadej/SomaSens/frontend/src/components/Home.tsx#L22-L24), [#L53](file:///Users/rafalmadej/SomaSens/frontend/src/components/Home.tsx#L53), [#L76](file:///Users/rafalmadej/SomaSens/frontend/src/components/Home.tsx#L76) | `marked` **nie sanitizuje** (od v5 nie ma już opcji `sanitize`). Wyjście LLM to dane niezaufane, a do promptu trafiają pola użytkownika (nazwy produktów, „avoids”, plan treningowy). Wystarczy produkt o nazwie `<img src=x onerror=...>` albo prompt injection, a model odda złośliwy HTML. Twój własny test `test_xss_payload_in_item_name` potwierdza, że `<script>` zapisuje się bez problemu. Razem z tokenem w `localStorage` oznacza to przejęcie sesji. | **krytyczny** | `npm i dompurify` i jedna funkcja renderująca (kod w 3.6). |
| Frontend | JWT w `localStorage`, ważny 7 dni, bez refresh tokena | [api.ts#L38](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L38), [auth.py#L17](file:///Users/rafalmadej/SomaSens/backend/auth.py#L17) | Każdy XSS (patrz wyżej) daje atakującemu tydzień dostępu. Przy tej skali nie wymagam BFF z cookie, ale **najpierw zamknij XSS**, a potem skróć TTL (np. 60 min) albo przejdź na cookie `httpOnly; SameSite=Strict`. | wysoki | `ACCESS_TOKEN_EXPIRE_MINUTES` przenieś do `Settings`. Po naprawie XSS ustaw 60–120 min. |
| Backend | **Brak rate limitu na endpointach AI** (najdroższych w systemie) | [main.py#L419-L586](file:///Users/rafalmadej/SomaSens/backend/main.py#L419-L586) | Każde wywołanie trzyma wątek z threadpoola (domyślnie 40) i połączenie z puli SQLAlchemy (5+10) do 120 s oraz obciąża GPU. Jeden zalogowany użytkownik może zablokować całe API. Limit jest tylko na `/auth/*`. | wysoki | `@limiter.limit("5/minute")` na `/ai/*`. Uwaga: slowapi wymaga parametru o nazwie **`request: Request`**, a w `get_workout_plan` ta nazwa jest już zajęta przez body, więc zmień ją na `payload` (kod w 3.6). |
| Backend | Brak limitów długości na polach trafiających do promptu i do bazy | [main.py#L82-L108](file:///Users/rafalmadej/SomaSens/backend/main.py#L82-L108) (`workout_plan`, `avoids`, `injuries`, `dietary_preferences`...), [models.py#L29-L31](file:///Users/rafalmadej/SomaSens/backend/models.py#L29-L31) (`ItemConsume.name`, lista bez limitu) | Można wysłać megabajty tekstu do lokalnego LLM (wolna odpowiedź, wyczerpanie okna kontekstu) albo do SQLite. `String(100)` w SQLite **nie jest egzekwowane**. Brakuje też zakresów liczbowych: `age=-5` i `weight=0` przechodzą. | wysoki | `Field(max_length=...)`, `ge`/`le`, `Literal[...]` (kod w 3.6). |
| Backend | Przestarzałe lub nieutrzymywane biblioteki auth: `passlib` (ostatnie wydanie 2020) z `bcrypt==3.2.0` przypiętym tylko dla zgodności, oraz `python-jose` | [requirements.txt#L11-L13](file:///Users/rafalmadej/SomaSens/requirements.txt#L11-L13) | Przypięcie bcrypt do wersji z 2020 roku istnieje tylko po to, żeby passlib się nie wywracał. To dług, który zablokuje aktualizacje bezpieczeństwa. Dokumentacja FastAPI przeszła na `PyJWT` + `pwdlib`. `python-jose` 3.5.0 ma załatane CVE-2024-33663/33664, ale projekt jest słabo utrzymywany. | średni | `pyjwt>=2.10`, `pwdlib[bcrypt]` (lub bezpośrednio `bcrypt>=4`). API jest prawie 1:1. |
| Backend | Nagłówki bezpieczeństwa ustawione na JSON API zamiast na SPA. `X-XSS-Protection` jest przestarzały | [main.py#L50-L59](file:///Users/rafalmadej/SomaSens/backend/main.py#L50-L59) | `X-Frame-Options` i HSTS na odpowiedziach JSON niewiele dają. XSS dzieje się w SPA serwowanym przez Vite, które **nie ma CSP**. `X-XSS-Protection: 1; mode=block` jest dziś odradzany (OWASP zaleca `0` albo pominięcie). | niski | Usuń `X-XSS-Protection`. CSP dodaj tam, gdzie będziesz hostować build frontendu. |
| Backend | `allow_credentials=True`, choć autoryzacja idzie przez nagłówek `Authorization`, a nie przez cookies | [main.py#L44](file:///Users/rafalmadej/SomaSens/backend/main.py#L44) | Uprawnienie, które nie jest potrzebne. Gdy ktoś później poszerzy listę originów, zrobi się z tego realna luka. | niski | `allow_credentials=False`. Po dodaniu proxy w Vite CORS w dev przestanie być potrzebny (patrz 3.4). |
| Backend | `uvicorn.run(app, host="0.0.0", ...)` | [main.py#L593-L596](file:///Users/rafalmadej/SomaSens/backend/main.py#L593-L596) | Literówka (miało być `0.0.0.0`) i nasłuch na wszystkich interfejsach. To martwy kod, bo nikt tak nie uruchamia aplikacji. | niski | Usuń blok. |
| DevOps | Szablon MCP z `npx -y <your-mcp-server>` w repo | [.continue/mcpServers/new-mcp-server.yaml](file:///Users/rafalmadej/SomaSens/.continue/mcpServers/new-mcp-server.yaml) | Śmieć z narzędzia. Po wypełnieniu `npx -y` instaluje i uruchamia dowolny pakiet bez potwierdzenia, co jest wektorem ataku na łańcuch dostaw. | niski | Usuń plik albo dodaj `.continue/` do `.gitignore`. |

### 3.2 Backend: poprawność i struktura

| Warstwa | Problem | Lokalizacja | Dlaczego to źle | Priorytet | Poprawka |
|---|---|---|---|---|---|
| Backend | **Prompt dostaje literały `None`** (zweryfikowałem uruchomieniem) | [main.py#L502](file:///Users/rafalmadej/SomaSens/backend/main.py#L502) + [prompts.py#L59](file:///Users/rafalmadej/SomaSens/backend/prompts.py#L59), [#L71-L76](file:///Users/rafalmadej/SomaSens/backend/prompts.py#L71-L76) | `model_dump()` zwraca klucze z wartością `None`, więc `dict.get('age', 'unknown')` zwraca `None`, a nie `'unknown'`. Model widzi `Age: None`, `Weight: None kg`, `Activity level: None`. Jakość planów spada i nikt tego nie zauważy, bo testy mockują `generate_workout_plan`. | **wysoki** | `request.model_dump(exclude_none=True)` + test promptu (kod w 3.6). |
| Backend | Komentarz kłamie: „Profile data overrides **or fills** missing request data” | [main.py#L509-L522](file:///Users/rafalmadej/SomaSens/backend/main.py#L509-L522) | Kod zawsze nadpisuje dane z requestu danymi z profilu. Pole celu w requeście jest ignorowane, gdy profil ma `goal`. Decyzja produktowa została oddana agentowi i nikt jej nie zweryfikował. | średni | `setdefault` (request wygrywa) albo jawna decyzja zapisana w specyfikacji. |
| Backend | **`/items/consume` i `CONSUMPTION_STRUCTURE` to martwa funkcja** | [prompts.py#L34-L42](file:///Users/rafalmadej/SomaSens/backend/prompts.py#L34-L42), [main.py#L231-L296](file:///Users/rafalmadej/SomaSens/backend/main.py#L231-L296); frontend nie zawiera ani słowa `consume` | LLM dostaje polecenie wygenerowania bloku JSON, którego nikt nie parsuje. Użytkownik widzi surowy JSON pod przepisem, tracisz tokeny i czas generacji. Endpoint ma testy, ale nie ma żadnego konsumenta. | wysoki | Zdecyduj: podłączyć (parsowanie, potwierdzenie w UI, wywołanie `/items/consume`) albo usunąć z promptu i API. |
| Backend | Logika `consume` przy duplikatach nazw: `setdefault` bierze **dowolny pierwszy** rekord, a reszta zużycia przepada | [main.py#L250-L273](file:///Users/rafalmadej/SomaSens/backend/main.py#L250-L273) | Dwie partie „Milk” (różne daty ważności) to rzecz normalna w spiżarni. Zużycie powinno iść od najszybciej wygasającej partii i przechodzić na kolejną. | średni | `order_by(expirationDate)` i pętla rozkładająca `quantity_used` na partie. |
| Backend | **`GET /profile` zapisuje do bazy** (efekt uboczny + race condition) | [main.py#L299-L314](file:///Users/rafalmadej/SomaSens/backend/main.py#L299-L314) | GET powinien być bezpieczny i idempotentny. Dwa równoległe GET dla nowego usera (np. `StrictMode` w dev odpala efekt dwukrotnie, albo dwie karty) mogą oba nie znaleźć profilu, oba zrobić INSERT i jeden dostanie `IntegrityError` na `UNIQUE(owner_id)`, czyli 500. | średni | Utwórz profil przy rejestracji albo użyj `INSERT ... ON CONFLICT DO NOTHING` (kod w 3.6). |
| Backend | „God module” `main.py` (~600 linii): schematy, middleware, rate limit, auth, CRUD, AI i logika biznesowa w endpointach | [main.py](file:///Users/rafalmadej/SomaSens/backend/main.py) | Budowanie `profile_context` ([#L460-L476](file:///Users/rafalmadej/SomaSens/backend/main.py#L460-L476)), `pantry_list` (zduplikowane w [#L447](file:///Users/rafalmadej/SomaSens/backend/main.py#L447) i [#L560](file:///Users/rafalmadej/SomaSens/backend/main.py#L560)), zapis `PlanDB` (3×) i `try/except LocalModelError` (3×) są skopiowane. Każda zmiana wymaga edycji w kilku miejscach, a agent łatwo zmieni tylko jedno z nich. | średni | Bez przeinżynierowania wystarczy: `routers/{auth,items,activities,profile,ai}.py`, `schemas.py`, `services/plans.py`, globalny `exception_handler` dla `LocalModelError`. |
| Backend | Schematy Pydantic rozrzucone: część w `models.py` (obok ORM), część w `main.py` | [models.py#L21-L44](file:///Users/rafalmadej/SomaSens/backend/models.py#L21-L44), [main.py#L63-L108](file:///Users/rafalmadej/SomaSens/backend/main.py#L63-L108) | Brak reguły, gdzie co trzymać, więc agent dokłada schematy losowo. | niski | Jeden `schemas.py`. |
| Backend | **Brak `response_model` na prawie wszystkich endpointach**; ORM zwracany wprost | np. [main.py#L171](file:///Users/rafalmadej/SomaSens/backend/main.py#L171), [#L191](file:///Users/rafalmadej/SomaSens/backend/main.py#L191), [#L299](file:///Users/rafalmadej/SomaSens/backend/main.py#L299) | (1) OpenAPI nie zawiera schematów odpowiedzi, więc nie da się wygenerować klienta i frontend zgaduje typy (patrz 3.4). (2) Każda nowa kolumna (np. kiedyś `UserDB` w relacji) **automatycznie wycieknie** do API. Dziś wyciekają `owner_id` i `id` profilu. `ConsumptionResponse.updated_items: List[dict]` to typowanie pozorne. | wysoki | Schematy `*Read` z `from_attributes=True` (kod w 3.6). |
| Backend | Kody statusów: `POST` zwraca 200 zamiast 201, `DELETE` zwraca 200 + `{"message": "Success"}` zamiast 204 | [main.py#L171](file:///Users/rafalmadej/SomaSens/backend/main.py#L171), [#L228](file:///Users/rafalmadej/SomaSens/backend/main.py#L228), [#L396](file:///Users/rafalmadej/SomaSens/backend/main.py#L396) | Niespójne z `/auth/logout`, który poprawnie zwraca 204. Testy utrwalają ten błąd (`assert ... == 200`). | niski | `status_code=status.HTTP_201_CREATED` / `HTTP_204_NO_CONTENT`. |
| Backend | `plan_type: str` bez walidacji: `/ai/last_plan/xyz` zwraca 200 i `null` | [main.py#L399-L416](file:///Users/rafalmadej/SomaSens/backend/main.py#L399-L416), test utrwalający: [test_ai_endpoints.py](file:///Users/rafalmadej/SomaSens/tests/test_ai_endpoints.py) `test_get_last_plan_invalid_type` | Literówka w kliencie nie zgłosi błędu, tylko po cichu zwróci pusty wynik. | niski | `plan_type: Literal["diet", "workout", "shopping"]`, wtedy dostajesz 422. |
| Backend | **Daty jako `String`**: `expirationDate`, `date`, `created_at` (do tego naiwny czas lokalny przez `datetime.now()`) | [models.py#L26](file:///Users/rafalmadej/SomaSens/backend/models.py#L26), [#L44](file:///Users/rafalmadej/SomaSens/backend/models.py#L44), [#L82](file:///Users/rafalmadej/SomaSens/backend/models.py#L82), [#L94](file:///Users/rafalmadej/SomaSens/backend/models.py#L94), [#L106](file:///Users/rafalmadej/SomaSens/backend/models.py#L106), [main.py#L488](file:///Users/rafalmadej/SomaSens/backend/main.py#L488) | `"expirationDate": "banana"` przechodzi walidację. Sortowanie „po dacie ważności” dla kontekstu AI działa tylko dla stringów ISO. `created_at` bez strefy czasowej jest niejednoznaczne. | średni | `datetime.date` w Pydantic, `Date`/`DateTime(timezone=True)` w ORM, `datetime.now(timezone.utc)`. Wymaga migracji (patrz niżej). |
| Backend | **Brak migracji**; `create_schema()` uruchamiane **przy imporcie modułu** + ręczna pętla po indeksach | [main.py#L23](file:///Users/rafalmadej/SomaSens/backend/main.py#L23), [database.py#L22-L27](file:///Users/rafalmadej/SomaSens/backend/database.py#L22-L27) | `create_all` nie doda nowej kolumny do istniejącej tabeli, więc schemat po cichu się rozjedzie. Import w testach (`from backend.main import app`) **dotyka produkcyjnego `backend/fitness_app.db`**. Pętla po indeksach to ręcznie zrobiona migracja. | średni | Alembic (`alembic init`, autogenerate). Do tego czasu `lifespan` zamiast wywołania przy imporcie (kod w 3.6). |
| Backend | Ścieżka bazy na sztywno w `database.py`, poza `Settings`; `ENVIRONMENT` w szablonie nigdzie nie jest używane | [database.py#L5-L8](file:///Users/rafalmadej/SomaSens/backend/database.py#L5-L8), [.env.template#L23-L24](file:///Users/rafalmadej/SomaSens/.env.template) | Konfiguracja w dwóch miejscach. Zmienna w szablonie sugeruje zachowanie, którego nie ma. | niski | `database_url: str = "sqlite:///backend/fitness_app.db"` w `Settings`. |
| Backend | ~20× `# type: ignore` jako skutek stylu SQLAlchemy 1.x (`Column(...)`) i legacy `db.query()` | [main.py#L266-L277](file:///Users/rafalmadej/SomaSens/backend/main.py#L266-L277), [#L463-L522](file:///Users/rafalmadej/SomaSens/backend/main.py#L463-L522) | Projekt nie ma mypy, więc te `ignore` wyciszają tylko IDE. Agent zamaskował ostrzeżenia, zamiast naprawić typy. SQLAlchemy 2.0 ma typowane `Mapped[...]`. | średni | `DeclarativeBase` + `Mapped[]`/`mapped_column`, potem dodaj mypy (kod w 3.6). |
| Backend | **Zero logowania** (`logging` nie występuje w ogóle) | cały `backend/` | `LocalModelError` jest zamieniany na 503 bez śladu w logach. Brak informacji, ile trwa generacja i kto przekracza limity. | średni | `logger = logging.getLogger(__name__)` + log w exception handlerze. |
| Backend | Wywołanie LLM trzyma otwartą sesję DB przez cały czas generacji (do 120 s) | [main.py#L419-L493](file:///Users/rafalmadej/SomaSens/backend/main.py#L419-L493) | Połączenie jest pobrane z puli (domyślnie 5 + 10 overflow). Przy kilkunastu równoległych generacjach pozostałe requesty czekają 30 s na połączenie, a potem dostają 500. Przy obecnej skali to niski priorytet, ale warto znać mechanizm. | niski | Najpierw zbierz kontekst, potem zwolnij sesję, wywołaj LLM i zapisz wynik w krótkiej sesji. Albo po prostu rate limit (wyżej). |
| Backend | Ten sam router zamontowany dwa razy (`/` i `/api/v1`, ten drugi ukryty w OpenAPI), a frontend używa wersji bez prefiksu | [main.py#L589-L590](file:///Users/rafalmadej/SomaSens/backend/main.py#L589-L590) | Pół-wersjonowanie: udokumentowana jest ścieżka **niewersjonowana**, a wersjonowana jest niewidoczna. To przeinżynierowanie z kosztem w postaci dwóch powierzchni API do utrzymania. | niski | Jeden prefiks `/api/v1`, a frontend przez proxy Vite (patrz 3.4). |
| Backend | Literały: komentarze po polsku w `database.py`, a wszędzie indziej po angielsku. Enumy `lodowka`/`spizarnia`/`szt` przy angielskim UI i dokumentacji („Ice, Pantry, Freezer”). `expirationDate` (camelCase) w kolumnie DB i `activityLevel` w `WorkoutRequest` obok `activity_level` w profilu | [database.py#L5-L18](file:///Users/rafalmadej/SomaSens/backend/database.py#L5-L18), [models.py#L10-L18](file:///Users/rafalmadej/SomaSens/backend/models.py#L10-L18), [main.py#L96](file:///Users/rafalmadej/SomaSens/backend/main.py#L96) | Instrukcje agenta wręcz **utrwalają** tę niespójność („intentionally mixed”, [copilot-instructions.md](file:///Users/rafalmadej/SomaSens/.github/copilot-instructions.md)). Dług techniczny został przepisany na regułę. | niski | Jedna konwencja w API (snake_case) i jednorazowa migracja przed pierwszym wdrożeniem. |

### 3.3 Frontend

| Warstwa | Problem | Lokalizacja | Dlaczego to źle | Priorytet | Poprawka |
|---|---|---|---|---|---|
| Frontend | **Błędy 422 wyświetlane jako `[object Object]`** | [api.ts#L32-L35](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L32-L35), [#L48-L51](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L48-L51) | Dla 422 FastAPI zwraca `detail` jako **tablicę** obiektów. `new Error(array)` daje w efekcie `"[object Object]"`. Realny scenariusz: hasło `ąęółżźćń...` ma 72 **znaki** (frontend `maxLength={72}` liczy jednostki UTF-16), ale ponad 72 **bajty**, więc backend zwraca 422 i użytkownik widzi bełkot. | wysoki | Centralny `request()` z normalizacją błędów (kod w 3.6). |
| Frontend | Niespójna obsługa błędów: tylko `getDietPlan` czyta `detail`, reszta rzuca generyczny tekst | [api.ts#L108-L111](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L108-L111) vs [#L132](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L132) | Backend zwraca użyteczny komunikat „Goal not defined. Please set 'Primary Goal' in your profile.”, a UI pokazuje „Error generating program.”. Użytkownik nie wie, co poprawić. | średni | Jak wyżej. |
| Frontend | W komponentach powtarza się ten sam boilerplate: `alert()`, `console.error`, puste `catch(() => {})` | [Pantry.tsx#L98](file:///Users/rafalmadej/SomaSens/frontend/src/components/Pantry.tsx#L98), [Activities.tsx#L63-L70](file:///Users/rafalmadej/SomaSens/frontend/src/components/Activities.tsx#L63-L70) (cichy błąd usuwania), [Home.tsx#L16-L20](file:///Users/rafalmadej/SomaSens/frontend/src/components/Home.tsx#L16-L20) | Trzy różne strategie w pięciu plikach. Błąd ładowania listy wygląda dokładnie jak „pusta lista”, więc użytkownik myśli, że stracił dane. Brak Error Boundary. | średni | Jeden stan `error` per widok + komponent `<ErrorBanner>`, Error Boundary w `App`. |
| Frontend | Pobieranie w `useEffect` bez `AbortController`, bez stanu błędu, `loadItems` spoza tablicy zależności | [Pantry.tsx#L35-L59](file:///Users/rafalmadej/SomaSens/frontend/src/components/Pantry.tsx#L35-L59), [Activities.tsx#L21-L41](file:///Users/rafalmadej/SomaSens/frontend/src/components/Activities.tsx#L21-L41), [AIAssistant.tsx#L36-L58](file:///Users/rafalmadej/SomaSens/frontend/src/components/AIAssistant.tsx#L36-L58), [Profile.tsx#L20-L32](file:///Users/rafalmadej/SomaSens/frontend/src/components/Profile.tsx#L20-L32) | W `StrictMode` każdy request leci dwa razy, a w połączeniu z `GET /profile` z efektem ubocznym daje to race opisany w 3.2. `exhaustive-deps` powinien to zgłosić (lintu nie mogłem uruchomić offline). Przy pięciu widokach z identycznym wzorcem warto mieć jeden hook. | średni | Mały `useApi()` z abortem (kod w 3.6) albo TanStack Query, jeśli projekt urośnie. |
| Frontend | **Paginacja `offset` + lokalne mutacje = duplikaty lub pominięte rekordy** | [Pantry.tsx#L116](file:///Users/rafalmadej/SomaSens/frontend/src/components/Pantry.tsx#L116), [#L262](file:///Users/rafalmadej/SomaSens/frontend/src/components/Pantry.tsx#L262); [Activities.tsx#L54](file:///Users/rafalmadej/SomaSens/frontend/src/components/Activities.tsx#L54), [#L179](file:///Users/rafalmadej/SomaSens/frontend/src/components/Activities.tsx#L179) | „Load More” liczy `offset = items.length`. Po dodaniu rekordu lokalnie offset przesuwa się o 1 i kolejna strona zwraca duplikat (zduplikowany `key`). Po usunięciu jeden rekord zostaje pominięty. | średni | Paginacja kursorem (`?before_id=`) albo przeładowanie od zera po mutacji. |
| Frontend | Filtrowanie i sortowanie po stronie klienta na **częściowo** załadowanych danych | [Pantry.tsx#L61-L78](file:///Users/rafalmadej/SomaSens/frontend/src/components/Pantry.tsx#L61-L78) | Wyszukiwarka i sortowanie „po dacie ważności” działają tylko na pierwszych 100 rekordach, więc wynik jest po cichu niepełny. | niski | Przy tej skali: `?q=` i `?sort=` na backendzie albo zniesienie paginacji dla spiżarni. |
| Frontend | Profil: twardo zakodowane „domyślne” dane (wiek 25, waga 75...), które przy błędzie GET zostają w formularzu i można je zapisać | [Profile.tsx#L7-L15](file:///Users/rafalmadej/SomaSens/frontend/src/components/Profile.tsx#L7-L15) | Fałszywe dane biometryczne trafiają do promptów AI. Ikona `CheckCircle2` pojawia się także przy błędzie ([#L65-L70](file:///Users/rafalmadej/SomaSens/frontend/src/components/Profile.tsx#L65-L70)), a `setTimeout` nie ma cleanupu. | średni | Stan początkowy `{}` + jawny stan błędu. |
| Frontend | Data aktywności liczona w UTC | [Activities.tsx#L19](file:///Users/rafalmadej/SomaSens/frontend/src/components/Activities.tsx#L19) | `toISOString()` zwraca datę w UTC. W Polsce między 00:00 a 01:00 (02:00 latem) formularz podpowiada **wczorajszą** datę. | niski | `new Date().toLocaleDateString('sv-SE')` (format `YYYY-MM-DD` w lokalnej strefie). |
| Frontend | `parseInt('')` daje `NaN`, które idzie do JSON jako `null`, a wzrost jest parsowany jako `int`, choć backend przyjmuje `float` | [AIAssistant.tsx#L291](file:///Users/rafalmadej/SomaSens/frontend/src/components/AIAssistant.tsx#L291), [Profile.tsx#L95-L117](file:///Users/rafalmadej/SomaSens/frontend/src/components/Profile.tsx#L95-L117) | Działa tylko przypadkiem: backend ma fallback `days if not None else 7`. To kruche. | niski | `valueAsNumber` + `Number.isNaN` → `undefined`. |
| Frontend | Komponenty-giganty i duplikacja: 6 prawie identycznych przycisków nawigacji, trzy razy powtórzony ternary `activeTab === 'diet' ? ... :` po ~10 razy, długie klasy Tailwind kopiowane na każde pole formularza | [App.tsx#L78-L130](file:///Users/rafalmadej/SomaSens/frontend/src/App.tsx#L78-L130), [AIAssistant.tsx](file:///Users/rafalmadej/SomaSens/frontend/src/components/AIAssistant.tsx) (395 linii) | Zmiana stylu pola wymaga edycji w kilkunastu miejscach. Dla agenta to zaproszenie do niespójności. | średni | Tablica konfiguracji `NAV_ITEMS.map(...)`, mapa `TAB_THEME[activeTab]`, komponenty `<Field>`, `<NavButton>`. |
| Frontend | Martwy i błędny CSS: `animate-pulse-glow`, `animate-shake`, `no-scrollbar` nie są zdefiniowane; `prose prose-invert` bez `@tailwindcss/typography`; `hover:shadow-[0_0_40_rgba(...)]` (brak `px`) | [AIAssistant.tsx#L211-L213](file:///Users/rafalmadej/SomaSens/frontend/src/components/AIAssistant.tsx#L211-L213), [Auth.tsx#L40](file:///Users/rafalmadej/SomaSens/frontend/src/components/Auth.tsx#L40), [#L92](file:///Users/rafalmadej/SomaSens/frontend/src/components/Auth.tsx#L92), [App.tsx#L76](file:///Users/rafalmadej/SomaSens/frontend/src/App.tsx#L76) | Klasy, które nic nie robią, to typowe halucynacje agenta. `no-scrollbar` sugeruje ukryty pasek przewijania, a on jest widoczny. | niski | Usuń albo zdefiniuj w `@layer utilities`. |
| Frontend | Pozostałości szablonów: `App.css` (logo Vite, nieimportowany), `assets/react.svg`, `frontend/README.md` (szablon Vite), `tailwind.config.js` (format v3, ignorowany przez v4), `autoprefixer` (v4 robi to sam), `manifest.json` wskazujący na nieistniejące `favicon.ico`/`logo192.png`/`logo512.png` (szablon CRA) | [App.css](file:///Users/rafalmadej/SomaSens/frontend/src/App.css), [manifest.json](file:///Users/rafalmadej/SomaSens/frontend/public/manifest.json), [tailwind.config.js](file:///Users/rafalmadej/SomaSens/frontend/tailwind.config.js) | Szum, który myli ludzi i agentów (agent może „poprawić” konfigurację, która nie jest ładowana). Manifest generuje błędy 404. | niski | Usuń. |
| Frontend | Nieużywane i rozjechane typy: `Theme`, `Language`, `WorkoutPayload` nieużywane; `unit: 'g' \| 'szt' \| 'ml'` (backend nie zna `ml`); `location: string` zamiast unii; `UserProfile` bez `null` | [types.ts](file:///Users/rafalmadej/SomaSens/frontend/src/types.ts) | TypeScript daje fałszywe poczucie bezpieczeństwa, bo typy nie odpowiadają API. `noUnusedLocals` nie łapie nieużywanych **eksportów**. | średni | Generowanie typów z OpenAPI (3.4). |
| Frontend | `lucide-react` i `marked` (runtime) w `devDependencies` | [package.json#L16-L34](file:///Users/rafalmadej/SomaSens/frontend/package.json#L16-L34) | Vite i tak je zbundluje, więc działa, ale semantyka jest myląca dla narzędzi audytu i dla agenta. | niski | Przenieś do `dependencies`. |
| Frontend | `@import url(fonts.googleapis...)` **po** `@import "tailwindcss"` | [index.css#L1-L2](file:///Users/rafalmadej/SomaSens/frontend/src/index.css#L1-L2) | Plugin Tailwinda wstawia regułę w miejscu pierwszego importu, więc `@import` czcionki ląduje za regułami i przeglądarka go ignoruje. Font Inter najpewniej się nie ładuje (sprawdź w DevTools → Network). | niski | Zamień kolejność linii. |
| Frontend | Brak routingu: widok w `useState`, więc odświeżenie zawsze wraca na Home, a przycisk „wstecz” nie działa | [App.tsx#L16](file:///Users/rafalmadej/SomaSens/frontend/src/App.tsx#L16) | Przy 6 widokach to akceptowalne, ale już wpływa na UX. | niski | Na tę skalę wystarczy synchronizacja z `location.hash`. |
| Frontend | Treści „marketingowe” wprowadzające w błąd: „encrypted vault”, „Registry: Active” (zielona kropka zakodowana na sztywno), „v2.6” | [About.tsx#L30](file:///Users/rafalmadej/SomaSens/frontend/src/components/About.tsx#L30), [#L63-L66](file:///Users/rafalmadej/SomaSens/frontend/src/components/About.tsx#L63-L66) | SQLite **nie jest szyfrowane**. Fałszywe deklaracje bezpieczeństwa to realne ryzyko prawne i wizerunkowe. | średni | Usuń albo napisz prawdę. |

### 3.4 Styk frontend ↔ backend

| Warstwa | Problem | Lokalizacja | Dlaczego to źle | Priorytet | Poprawka |
|---|---|---|---|---|---|
| Integracja | `API_BASE = 'http://127.0.0.1:8000'` na sztywno, bez `import.meta.env`, bez proxy Vite | [api.ts#L3](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L3), [vite.config.ts](file:///Users/rafalmadej/SomaSens/frontend/vite.config.ts) | Strona chodzi na `localhost:5173`, a API na `127.0.0.1:8000`, więc każdy request jest cross-origin z preflightem. Wystarczy otworzyć `127.0.0.1:5173` (origin spoza listy) i wszystko pada na CORS. Build produkcyjny nie zadziała nigdzie poza lokalną maszyną. | wysoki | Proxy + `VITE_API_URL` (kod w 3.6). |
| Integracja | Ręcznie pisane typy zamiast kontraktu z OpenAPI; mieszane konwencje nazw | [types.ts](file:///Users/rafalmadej/SomaSens/frontend/src/types.ts), [api.ts#L116-L125](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L116-L125) | Bez `response_model` po stronie backendu nie da się wygenerować klienta. Frontend zgaduje i już się rozjechał (`ml`, brak `null`, inline typ payloadu zamiast nieużywanego `WorkoutPayload`). | średni | Po dodaniu `response_model`: `npx openapi-typescript http://127.0.0.1:8000/openapi.json -o src/api-types.ts` jako skrypt `npm run gen:api`. |
| Integracja | Duplikacja walidacji z różną semantyką: `maxLength={72}` (znaki) vs 72 bajty; `min="1"` na froncie vs brak zakresów w profilu na backendzie | [Auth.tsx#L82-L83](file:///Users/rafalmadej/SomaSens/frontend/src/components/Auth.tsx#L82-L83) vs [auth.py#L31-L35](file:///Users/rafalmadej/SomaSens/backend/auth.py#L31-L35) | Źródłem prawdy powinien być backend, a frontend musi umieć pokazać jego 422. Dziś nie umie (3.3). | średni | Patrz 3.3 + 3.6. |
| Integracja | Obsługa 401: `logoutUser()` bez `await` i od razu `window.location.reload()` | [api.ts#L14-L19](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L14-L19) | Reload przerywa request logout w locie. Twardy reload kasuje wpisane dane formularza. Logika auth jest ukryta w warstwie fetch. | niski | Zdarzenie `unauthorized` + `setIsAuthenticated(false)` w `App` (3.6). |
| Integracja | Brak timeoutu, anulowania i streamingu dla generacji AI (do 120 s) | [api.ts#L102-L159](file:///Users/rafalmadej/SomaSens/frontend/src/api.ts#L102-L159) | Użytkownik patrzy na „Initializing Core...” przez 2 minuty bez możliwości anulowania. Ollama wspiera `stream: true`. | niski | Na start: `AbortSignal.timeout(130_000)` + przycisk „Anuluj”. Streaming jako osobny etap. |

### 3.5 Testy, narzędzia, dokumentacja, proces

| Warstwa | Problem | Lokalizacja | Dlaczego to źle | Priorytet | Poprawka |
|---|---|---|---|---|---|
| Testy | **„Testy” bez asercji, które tylko wypisują `print`**: 6 z 17 w `test_security.py` | [test_security.py#L86-L101](file:///Users/rafalmadej/SomaSens/tests/test_security.py#L86-L101), [#L207-L214](file:///Users/rafalmadej/SomaSens/tests/test_security.py#L207-L214), [#L220-L229](file:///Users/rafalmadej/SomaSens/tests/test_security.py#L220-L229), [#L232-L246](file:///Users/rafalmadej/SomaSens/tests/test_security.py#L232-L246), [#L327-L349](file:///Users/rafalmadej/SomaSens/tests/test_security.py#L327-L349), [#L355-L376](file:///Users/rafalmadej/SomaSens/tests/test_security.py#L355-L376) | Zawsze przechodzą, więc tworzą iluzję pokrycia. Test rate limitu działa przy `limiter.enabled = False` ([conftest.py#L23](file:///Users/rafalmadej/SomaSens/tests/conftest.py#L23)), więc **z definicji** niczego nie sprawdza. Docstring „CORS is set to allow all origins” jest nieaktualny. | **wysoki** | Prawdziwe asercje (kod w 3.6). |
| Testy | Testy pozorne: `jwt_secret = "cyber-secret-2026-somasense"` (hardkodowany string, a nie prawdziwy sekret z settings); „SQL injection via email field” testuje pole `name`; `test_hashed_password_never_exposed` sprawdza `/items`, gdzie hasła nigdy nie było | [test_security.py#L8-L10](file:///Users/rafalmadej/SomaSens/tests/test_security.py#L8-L10), [#L186-L204](file:///Users/rafalmadej/SomaSens/tests/test_security.py#L186-L204) | Nazwy obiecują więcej, niż testy sprawdzają. Klasyczny ślad bezkrytycznego przyjęcia testów od agenta. | średni | `assert get_settings().jwt_secret_key not in response.text`. Usuń redundantne testy. |
| Testy | `conftest` robi `load_dotenv()` z prywatnego `.env` dewelopera; `dependency_overrides` nigdy nie jest czyszczone | [conftest.py#L9-L16](file:///Users/rafalmadej/SomaSens/tests/conftest.py#L9-L16), [#L50](file:///Users/rafalmadej/SomaSens/tests/conftest.py#L50) | Wynik testów zależy od lokalnego `.env`. Przykład: ustawisz `OLLAMA_MODEL=gemma4:12b` i `test_generate_uses_local_ollama_api` (asercja na `"gemma4"`, `timeout=120`) przestaje przechodzić tylko u ciebie. | średni | Wymuszaj wartości testowe (`os.environ[...] = ...`), `get_settings.cache_clear()`, `app.dependency_overrides.clear()` w teardown. |
| Testy | Luki w pokryciu: brak testów promptów (złapałyby `None`), `consume` z duplikatami nazw, kształtu 422, rate limitu, równoległego `GET /profile` | `tests/` | Testy pokrywają ścieżki, które agent sam sobie wymyślił, a nie te, które się psują. | średni | Patrz plan naprawczy. |
| Testy | **Brak jakichkolwiek testów frontendu** (nie ma Vitest ani RTL) | `frontend/` | Krytyczne ścieżki (logowanie, obsługa 401, render markdown/XSS, paginacja) nie są w ogóle weryfikowane. CI robi tylko lint i build. | wysoki | Vitest + RTL, na start 4–5 testów zachowania (kod w 3.6). |
| Narzędzia | Brak `ruff`/`mypy`/`pre-commit`, brak Prettiera; nieużywane importy w testach (`import pytest`, `MagicMock`) | [test_items.py](file:///Users/rafalmadej/SomaSens/tests/test_items.py), [test_profile.py](file:///Users/rafalmadej/SomaSens/tests/test_profile.py), [test_ai_endpoints.py](file:///Users/rafalmadej/SomaSens/tests/test_ai_endpoints.py) | Backend nie ma żadnej automatycznej bramki jakości poza testami, więc agent może wprowadzić dowolny bałagan. | średni | `pyproject.toml` z `[tool.ruff]` i `[tool.mypy]` + krok w CI. |
| DevOps | `requirements.txt`: brak lockfile'a, mieszanie `==` z `>=`, runtime razem z dev (`pytest` w produkcji), nieużywane pakiety (`tenacity`, `pydantic-extra-types`, `pytest-asyncio`, czyli brak testów async), redundantne (`starlette`, `uvloop`, `watchfiles` są już w `fastapi`/`uvicorn[standard]`; jawne `uvloop` blokuje instalację na Windows) | [requirements.txt](file:///Users/rafalmadej/SomaSens/requirements.txt) | Build nie jest powtarzalny: `SQLAlchemy>=2.0.0` może jutro zainstalować wersję z breaking change. **Halucynacji pakietów nie znalazłem**: wszystkie zadeklarowane pakiety istnieją i są zainstalowane w zweryfikowanych wersjach. | średni | `pyproject.toml` z grupą `[dependency-groups] dev` + `uv lock` (albo `pip-tools`). |
| DevOps | CI bez `pip-audit`/`npm audit`, bez cache pip, bez lintera Pythona; PR-y mergowane 4–8 minut po commicie | [ci.yml](file:///Users/rafalmadej/SomaSens/.github/workflows/ci.yml), `git log` | Brak realnego review. CI zostało dodane dopiero w drugim commicie. | niski | Dodaj kroki `ruff check`, `mypy backend`, `pip-audit`, `npm audit --audit-level=high`, `npm test`. |
| Dokumentacja | Rozjazd komend: `GEMINI.md` i `copilot-instructions.md` używają `./env/bin/...`, a README i `run_app.sh` używają `./.venv/bin/...` | [GEMINI.md](file:///Users/rafalmadej/SomaSens/GEMINI.md), [copilot-instructions.md#L10-L20](file:///Users/rafalmadej/SomaSens/.github/copilot-instructions.md) vs [run_app.sh#L16](file:///Users/rafalmadej/SomaSens/run_app.sh#L16) | Agent dostaje złe komendy i albo zawiedzie, albo „naprawi” to tworząc drugi venv. | średni | Jeden plik `AGENTS.md` jako źródło prawdy, a pozostałe tylko do niego linkują. |
| Frontend (a11y) | Etykiety niepowiązane z polami (brak `htmlFor`/`id`), placeholder zamiast label w `Auth`; przyciski z samą ikoną bez `aria-label` (usuń, zamknij modal, FAB, nawigacja na mobile przez `hidden sm:block`); klikalny `<div>` z logo; modal bez semantyki dialogu, fokusu i Escape; `user-scalable=no`; `lang="pl"` przy angielskim UI | [Profile.tsx#L89-L97](file:///Users/rafalmadej/SomaSens/frontend/src/components/Profile.tsx#L89-L97), [Auth.tsx#L67-L88](file:///Users/rafalmadej/SomaSens/frontend/src/components/Auth.tsx#L67-L88), [Pantry.tsx#L173-L178](file:///Users/rafalmadej/SomaSens/frontend/src/components/Pantry.tsx#L173-L178), [#L281-L337](file:///Users/rafalmadej/SomaSens/frontend/src/components/Pantry.tsx#L281-L337), [App.tsx#L67](file:///Users/rafalmadej/SomaSens/frontend/src/App.tsx#L67), [#L84](file:///Users/rafalmadej/SomaSens/frontend/src/App.tsx#L84), [index.html#L2-L5](file:///Users/rafalmadej/SomaSens/frontend/index.html#L2-L5) | Czytnik ekranu na mobile ogłasza 6 przycisków bez nazwy (`display:none` usuwa tekst z drzewa dostępności). Blokada zoomu łamie WCAG 1.4.4. Usuwanie bez potwierdzenia. | średni | Natywny `<dialog>` + `showModal()` (fokus i Escape dostajesz za darmo), `aria-label` na przyciskach z ikoną, `<label htmlFor>` z `useId()`. |

### 3.6 Proponowane poprawki: kod

Wersje docelowe: FastAPI 0.129, Pydantic 2.12, SQLAlchemy 2.0, slowapi 0.1.10, React 19, TypeScript 5.9 (z `erasableSyntaxOnly`!), marked 17, Vite 7.

<details>
<summary><b>A. XSS: bezpieczny render markdown (krytyczne)</b></summary>

```bash
npm --prefix frontend i dompurify
```

```tsx
// frontend/src/components/Markdown.tsx
import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownProps {
  source: string;
  className?: string;
}

export function Markdown({ source, className }: MarkdownProps) {
  const html = useMemo(
    // `async: false` → przeciążenie zwraca `string`, bez rzutowania `as string`
    () => DOMPurify.sanitize(marked.parse(source, { async: false })),
    [source],
  );
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
```

Użycie: zamień oba `parseMarkdown` w `Home.tsx`/`AIAssistant.tsx` na `<Markdown source={currentResult} className="prose-ai" />`.
</details>

<details>
<summary><b>B. Backend: rate limit AI, poprawny merge profilu, brak <code>None</code> w promptach, globalny handler</b></summary>

```python
# backend/main.py (fragmenty)
import logging
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.create_schema()  # docelowo: `alembic upgrade head` w skrypcie startowym
    yield


app = FastAPI(title="SomaSense API", lifespan=lifespan)  # usuń wywołanie create_schema() z poziomu modułu


@app.exception_handler(ai_service.LocalModelError)
async def local_model_error_handler(_: Request, exc: ai_service.LocalModelError) -> JSONResponse:
    logger.warning("Local model failure: %s", exc, exc_info=exc.__cause__)
    return JSONResponse(status_code=503, content={"detail": str(exc)})


PROFILE_TO_REQUEST = {
    "age": "age",
    "weight": "weight",
    "height": "height",
    "gender": "gender",
    "goal": "goal",
    "activity_level": "activityLevel",
}


@api_router.post("/ai/workout", response_model=PlanResponse)
@limiter.limit("5/minute")
def get_workout_plan(
    request: Request,            # slowapi wymaga parametru o tej nazwie
    payload: WorkoutRequest,     # body przemianowane z `request`
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    user_data = payload.model_dump(exclude_none=True)   # koniec z "Age: None"
    profile = db.scalar(
        select(models.UserProfileDB).where(models.UserProfileDB.owner_id == current_user.id)
    )
    if profile:
        for column, key in PROFILE_TO_REQUEST.items():
            value = getattr(profile, column)
            if value is not None:
                user_data.setdefault(key, value)   # request wygrywa, profil uzupełnia luki

    if not user_data.get("goal"):
        raise HTTPException(status_code=400, detail="Goal not defined. Please set 'Primary Goal' in your profile.")

    plan = ai_service.generate_workout_plan(user_data)  # LocalModelError → handler 503
    plans_service.save_plan(db, current_user.id, "workout", plan)
    return {"plan": plan}
```

```python
# backend/services/plans.py: jedna implementacja zamiast trzech kopii
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend import models


def save_plan(db: Session, owner_id: int, plan_type: str, content: str) -> None:
    db.add(models.PlanDB(
        plan_type=plan_type,
        content=content,
        created_at=datetime.now(timezone.utc),  # po migracji kolumny na DateTime(timezone=True)
        owner_id=owner_id,
    ))
    db.commit()
```
</details>

<details>
<summary><b>C. Schematy wejścia i wyjścia, limity, kody statusów</b></summary>

```python
# backend/schemas.py
from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from backend.models import LocationEnum, UnitEnum


class PantryItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    quantity: int = Field(gt=0, le=1_000_000)
    unit: UnitEnum = UnitEnum.GRAMS
    location: LocationEnum
    expirationDate: date          # "banana" → 422; JSON nadal "2025-01-15"


class PantryItemRead(PantryItemCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int                       # bez owner_id: nie wycieka


class UserProfileUpdate(BaseModel):
    age: int | None = Field(default=None, ge=10, le=120)
    weight: float | None = Field(default=None, gt=0, le=500)
    height: float | None = Field(default=None, gt=0, le=300)
    gender: Literal["male", "female", "other"] | None = None
    goal: str | None = Field(default=None, max_length=100)
    activity_level: str | None = Field(default=None, max_length=100)
    dietary_preferences: str | None = Field(default=None, max_length=500)


class ShoppingRequest(BaseModel):
    workout_plan: str | None = Field(default=None, max_length=8_000)
    days: int = Field(default=7, ge=1, le=30)
    budget: float | None = Field(default=None, gt=0, le=100_000)
    avoids: str | None = Field(default=None, max_length=300)
    preferences: str | None = Field(default=None, max_length=300)


class UserProfileRead(UserProfileUpdate):
    model_config = ConfigDict(from_attributes=True)


class PlanResponse(BaseModel):
    plan: str
```

```python
# backend/main.py
from typing import Annotated
from fastapi import Body

@api_router.post("/items", response_model=schemas.PantryItemRead, status_code=status.HTTP_201_CREATED)
def create_item(...): ...

@api_router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(...) -> None: ...

@api_router.post("/items/consume", response_model=models.ConsumptionResponse)
def consume_items(
    consumption: Annotated[list[models.ItemConsume], Body(min_length=1, max_length=50)],
    ...
): ...

@api_router.get("/ai/last_plan/{plan_type}")
def get_last_plan(plan_type: Literal["diet", "workout", "shopping"], ...): ...
```

```python
# GET /profile bez wyścigu: idempotentny upsert (SQLite ≥ 3.24)
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

@api_router.get("/profile", response_model=schemas.UserProfileRead)
def get_profile(db: Session = Depends(database.get_db),
                current_user: models.UserDB = Depends(auth.get_current_user)):
    db.execute(
        sqlite_insert(models.UserProfileDB)
        .values(owner_id=current_user.id)
        .on_conflict_do_nothing(index_elements=["owner_id"])
    )
    db.commit()
    return db.scalars(
        select(models.UserProfileDB).where(models.UserProfileDB.owner_id == current_user.id)
    ).one()
```
(Czystsze rozwiązanie to utworzenie profilu w `register`. Wtedy GET jest wyłącznie odczytem.)
</details>

<details>
<summary><b>D. Typowane modele SQLAlchemy 2.0 (znika ~20× <code># type: ignore</code>)</b></summary>

```python
# backend/database.py
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

```python
# backend/models.py
from datetime import date
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

class PantryItemDB(Base):
    __tablename__ = "pantry_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    quantity: Mapped[int]
    unit: Mapped[UnitEnum] = mapped_column(default=UnitEnum.GRAMS)
    location: Mapped[LocationEnum] = mapped_column(default=LocationEnum.SPIZARNIA)
    expiration_date: Mapped[date] = mapped_column("expirationDate")  # nazwa kolumny bez zmian
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    owner: Mapped["UserDB"] = relationship(back_populates="items")
```
Zmiana typu kolumny z `String` na `Date` wymaga migracji: `alembic revision --autogenerate -m "typed dates"`.
</details>

<details>
<summary><b>E. Frontend: jeden klient API, normalizacja 422, proxy Vite</b></summary>

```ts
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } },
  },
});
```

```ts
// frontend/src/api/client.ts
const API_BASE: string = import.meta.env.VITE_API_URL ?? '/api/v1'; // tylko publiczny URL, żadnych sekretów
export const TOKEN_KEY = 'somasense_token';
export const UNAUTHORIZED_EVENT = 'somasense:unauthorized';

// erasableSyntaxOnly: bez `constructor(public status)`
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ValidationIssue { loc: (string | number)[]; msg: string }

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const { detail } = body as { detail: unknown };
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return (detail as ValidationIssue[])
        .map((issue) => `${issue.loc.at(-1) ?? ''}: ${issue.msg}`)
        .join('; ');
    }
  }
  return fallback;
}

export async function request<T>(path: string, init: RequestInit = {}, fallback = 'Request failed.'): Promise<T> {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && token) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT)); // App reaguje setIsAuthenticated(false), bez reload
  }
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(extractMessage(body, fallback), res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// przykład użycia
export const fetchPantryItems = (limit = 100, offset = 0, signal?: AbortSignal) =>
  request<PantryItem[]>(`/items?${new URLSearchParams({ limit: `${limit}`, offset: `${offset}` })}`, { signal });
```

```tsx
// App.tsx
useEffect(() => {
  const onUnauthorized = () => setIsAuthenticated(false);
  window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
}, []);
```
</details>

<details>
<summary><b>F. Frontend: efekt z anulowaniem (bezpieczny w StrictMode)</b></summary>

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetchPantryItems(PAGE_SIZE, 0, controller.signal)
    .then((data) => {
      setItems(data);
      setHasMore(data.length === PAGE_SIZE);
    })
    .catch((e: unknown) => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Failed to load inventory.');
    })
    .finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
  return () => controller.abort();
}, []);
```
</details>

<details>
<summary><b>G. Testy, które naprawdę coś sprawdzają</b></summary>

```python
# tests/conftest.py: deterministyczne środowisko
import os
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only-32-chars-min"  # wymuszone, nie "jeśli brak"
os.environ["OLLAMA_MODEL"] = "gemma4"
os.environ["OLLAMA_TIMEOUT_SECONDS"] = "120"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:5173"

from backend.config import get_settings  # noqa: E402
get_settings.cache_clear()

@pytest.fixture
def db_session(test_db):
    ...
    app.dependency_overrides[get_db] = override_get_db
    yield session
    session.close()
    app.dependency_overrides.clear()
    test_db.dispose()


@pytest.fixture
def rate_limited(monkeypatch):
    monkeypatch.setattr(limiter, "enabled", True)
    limiter.reset()
    yield
    limiter.reset()
```

```python
# tests/test_security.py: zamiast print()
def test_login_is_rate_limited(client, rate_limited):
    form = {"username": "nobody@test.com", "password": "wrongpass1"}
    for _ in range(5):
        assert client.post("/auth/token", data=form).status_code == 401
    assert client.post("/auth/token", data=form).status_code == 429


def test_cors_rejects_unknown_origin(client):
    response = client.options(
        "/items",
        headers={"Origin": "http://malicious.com", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in response.headers


def test_jwt_secret_not_in_responses(client):
    response = client.post("/auth/register", json={"email": "s@example.com", "password": "password123"})
    assert get_settings().jwt_secret_key not in response.text


# tests/test_prompts.py: złapałby dzisiejszy bug
from backend.main import WorkoutRequest
from backend.prompts import build_workout_prompt

def test_workout_prompt_has_no_none_literals():
    prompt = build_workout_prompt(WorkoutRequest(goal="Build muscle").model_dump(exclude_none=True))
    assert "None" not in prompt
```

```tsx
// frontend/src/components/Markdown.test.tsx  (vitest + @testing-library/react + jsdom)
import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Markdown } from './Markdown';

test('strips executable HTML from model output', () => {
  const { container } = render(<Markdown source={'# Plan\n<img src=x onerror="alert(1)">'} />);
  expect(container.querySelector('h1')?.textContent).toBe('Plan');
  expect(container.innerHTML).not.toContain('onerror');
});
```
</details>

---

## 4. Ślady pracy z AI

### Co wskazuje na bezkrytyczne użycie agenta

- **Wielki zrzut zamiast iteracji.** Commit `ddc2d3e` „Set up SomaSens project” to **8966 linii w 51 plikach** naraz, łącznie z testami „penetracyjnymi”. Drugi commit zmienia 20 plików naraz: migrację na Ollamę, dodanie CI, `config.py` i `prompts.py`. PR-y mergowane 4–8 minut po commicie, czyli bez review.
- **„Security theater”.** Widać dużo widocznych elementów z checklisty bezpieczeństwa (odwoływanie przez `jti`, `iss`/`aud`, middleware nagłówków, klasa `TestSQLInjectionVulnerabilities`, dwa prefiksy wersjonowania), a jednocześnie brakuje tego, co realnie chroni: sanitizacji HTML, limitów wejścia, `response_model`, rate limitu tam, gdzie jest koszt.
- **Testy, które zawsze przechodzą**, z `print("⚠️ WARNING ...")` i emoji. Test rate limitu działa przy wyłączonym limiterze. Docstringi są nieaktualne po zmianach (CORS „allows all”).
- **Wymyślone klasy CSS** (`animate-pulse-glow`, `animate-shake`, `no-scrollbar`, `prose` bez pluginu), literówka `0_0_40_rgba`, pozostałości szablonów CRA (`manifest.json`) i Vite (`App.css`, README).
- **Funkcja wymyślona, ale niepodłączona**: `CONSUMPTION_STRUCTURE` w prompcie + `/items/consume` + testy, a zero użycia w UI.
- **Wyciszanie zamiast naprawy**: ~20× `# type: ignore` w projekcie, który w ogóle nie uruchamia type checkera.
- **Komentarze-narracje**: `# 1. Ścieżka do pliku bazy`, `# 3. Sesja (to nasze "okno" do bazy)`, `{/* Button light reflection */}`. Komentarz niezgodny z kodem: „overrides or fills”.
- **Fluff językowy** w UI i dokumentacji: „Magnitude”, „Decomposition (Expiry)”, „Calibrating Guidance Link...”, „digital framework for the human biological vessel”, „encrypted vault” (nieprawda). Utrudnia to zrozumienie produktu i wprowadza użytkownika w błąd.
- **Trzy narzędzia AI, trzy konfiguracje** (`GEMINI.md`, `.github/copilot-instructions.md`, `.continue/` z pustym szablonem), które już się rozjechały (`env/` vs `.venv/`).
- **Niespójność w obrębie jednej warstwy** sugeruje różne sesje agenta: `List`/`Optional` obok `dict[str, Any]`, polskie komentarze w jednym pliku, różne strategie błędów w każdym komponencie.

### Co wskazuje na świadome prowadzenie

- **Drugi commit naprawdę poprawia architekturę**: wyciągnięte `config.py` (`pydantic-settings` zamiast rozproszonych `os.getenv` + `load_dotenv`), `prompts.py`, timeout i własny wyjątek w `ai_service`, dodane CI. To wygląda na świadomy refactor po przeczytaniu kodu.
- `copilot-instructions.md` zawiera **twarde ograniczenia** (zawsze `owner_id`, kontrakt paginacji, limity kontekstu AI, mockowanie `ai_service` w testach). Widać, że to Ty zdecydowałeś, czego agentowi nie wolno.
- Detale, które zwykle wymagają wiedzy: dummy hash przy logowaniu, limit 72 bajtów dla bcrypt, `def` zamiast `async def`, zapytanie `IN` zamiast N+1, limity kontekstu dla LLM.

### Backend vs frontend

Backend był wyraźnie **czytany i poprawiany**: ma testy, konfigurację, granicę serwisu AI i decyzje bezpieczeństwa. Frontend wygląda na **zaakceptowany wizualnie** („ładnie wygląda, działa na happy path”): nie ma testów, brakuje dostępności, CSS jest częściowo martwy, logika jest powielona, a najpoważniejsza luka w projekcie (XSS) leży właśnie tu. Typowy obraz: agent dobrze generuje efektowny UI, a człowiek nie ma narzędzi (testów i reguł), żeby go zweryfikować.

---

## 5. Plan naprawczy

| # | Działanie | Wysiłek | Oczekiwany efekt |
|---|---|---|---|
| 1 | **Sanitizacja markdown** (`DOMPurify` + komponent `<Markdown>`) i test Vitest na payload XSS (3.6 A, G) | **S** | Zamyka jedyną krytyczną lukę i ścieżkę do kradzieży tokenu. |
| 2 | **Granice API**: `max_length`/`ge`/`le`/`Literal` we wszystkich schematach wejścia, rate limit na `/ai/*`, limit długości listy w `/items/consume`, skrócenie TTL tokenu i przeniesienie go do `Settings` (3.6 B, C) | **S** | Koniec z DoS przez LLM i śmieciami w bazie. Mniejsze okno ataku. |
| 3 | **Poprawność AI**: `exclude_none`, decyzja „request vs profil”, decyzja w sprawie `CONSUMPTION_STRUCTURE` (podłączyć albo usunąć), testy `prompts.py` | **S–M** | Lepsza jakość planów, mniej tokenów, brak martwego kodu. |
| 4 | **Uczciwe testy**: zamiana 6 testów opartych na `print` na asercje, deterministyczny `conftest` (bez `load_dotenv`, czyszczenie overrides), testy rate limitu, 422 i `GET /profile` | **S** | Zielony CI zaczyna coś znaczyć. Agent nie przemyci regresji. |
| 5 | **Kontrakt API**: `response_model` + `status_code` wszędzie, jeden prefiks `/api/v1`, proxy Vite + `VITE_API_URL`, `request()` z normalizacją błędów, generowane typy `openapi-typescript` (3.6 C, E) | **M** | Frontend przestaje zgadywać, a 422 jest czytelne dla użytkownika. Działa poza localhostem. |
| 6 | **Warstwa danych**: `Mapped[]`, daty jako `Date`/`DateTime(tz)`, Alembic, `lifespan` zamiast efektu przy imporcie, GET profilu bez zapisu (3.6 C, D) | **M** | Schemat ewoluuje bez ręcznych hacków. Znika ~20× `type: ignore`. Testy nie dotykają produkcyjnej bazy. |
| 7 | **Bramki jakości**: `pyproject.toml` (ruff, mypy, grupa dev, lockfile `uv`), `pip-audit`, `npm audit`, Vitest w CI, pre-commit | **S–M** | Szybka, automatyczna informacja zwrotna na każdą zmianę agenta. |
| 8 | **Porządki we frontendzie**: rozbicie `AIAssistant`/`App` na małe komponenty, `useApi` z abortem, paginacja kursorem, poprawki a11y (`<dialog>`, `aria-label`, `label htmlFor`), usunięcie martwego CSS i szablonów, prawdziwe teksty w `About` | **M** | Łatwiejsze utrzymanie, dostępność i spójny UX błędów. |

---

## 6. Rekomendacje rozwojowe dla Juniora

**Python / FastAPI**
1. **Kontrakt API jako pierwszy obywatel.** Ćwicz rozdzielanie schematów `Create`/`Update`/`Read` z `from_attributes=True`, `response_model` i `status_code`. Zobacz potem, jak wygląda `/docs` i co da się z niego wygenerować. Lektura: rozdziały „Response Model” i „Extra Models” w dokumentacji FastAPI.
2. **SQLAlchemy 2.0 typed ORM + Alembic.** `Mapped[]`, `select()` zamiast `query()`, transakcje (`with Session.begin()`), migracje autogenerate. To jednym ruchem usuwa całą klasę `type: ignore` i bugów schematu.
3. **Myślenie o granicach zaufania.** Każde wejście (użytkownik, LLM, zewnętrzne API) wymaga limitów, walidacji i, przy wyjściu, kodowania lub sanitizacji. Przejdź OWASP ASVS rozdziały V5 (walidacja) i V3 (sesje) dla swojej aplikacji.

**React**

4. **Pobieranie danych i efekty.** Przeczytaj „You Might Not Need an Effect” i „Synchronizing with Effects” z react.dev (cleanup, abort, StrictMode). Potem napisz własny `useApi` albo wdroż TanStack Query, żeby poczuć różnicę.
5. **Testy zachowania + dostępność.** Vitest + Testing Library z zapytaniami `getByRole`/`getByLabelText`. Jeśli test nie znajduje pola po etykiecie, znaczy to, że czytnik ekranu też go nie znajdzie. To najszybszy sposób, żeby nauczyć się a11y „przy okazji”.

**Współpraca z agentem AI**
- **Jeden `AGENTS.md`** jako źródło prawdy (komendy z `.venv`, konwencje, „Definition of Done”). `GEMINI.md` i `copilot-instructions.md` niech tylko do niego linkują. Dopisz reguły, których dziś brakuje: *„Każdy endpoint ma `response_model` i `status_code`”*, *„Nigdy `dangerouslySetInnerHTML` bez `DOMPurify`”*, *„Każde pole tekstowe w schemacie ma `max_length`”*, *„Test bez `assert` jest zabroniony; `print` w testach jest zabroniony”*, *„Nie dodawaj klas CSS, które nie istnieją w `index.css` ani w Tailwindzie”*, *„Nie usuwaj ostrzeżeń przez `# type: ignore`”*. Zamiast *„intentionally mixed naming”* napisz *„nowe pola: snake_case”*.
- **Spec przed kodem.** Dla każdej funkcji (np. „zużycie produktów po posiłku”) napisz 5–10 linii: cel, kontrakt API, przypadki brzegowe, kryterium akceptacji. Wtedy agent nie wymyśli `CONSUMPTION_STRUCTURE`, którego nikt nie konsumuje.
- **Małe, atomowe commity** (np. Conventional Commits: `fix(ai): drop None fields from workout prompt`). Jeden PR to jedna zmiana, którą jesteś w stanie przeczytać w 10 minut. PR o rozmiarze 9000 linii nie przechodzi review, tylko akceptację.
- **Review outputu agenta według checklisty**: (1) czy każdy test ma asercję, która może się nie powieść, (2) czy każda nowa klasa, funkcja i pakiet faktycznie istnieje i jest użyta, (3) czy komentarz zgadza się z kodem, (4) czy dane niezaufane trafiają do HTML, SQL lub promptu.
- **Weryfikowalność przed generacją.** Najpierw postaw bramki (ruff, mypy, Vitest, pip-audit w CI), dopiero potem proś agenta o funkcje. Agent jest tak dobry, jak szybka i bezlitosna jest pętla informacji zwrotnej, w której pracuje.

---

## 7. Ocena końcowa

| Obszar | Ocena | Uzasadnienie |
|---|:-:|---|
| Architektura | **5/10** | Sensowny podział backend/frontend i wydzielone `config`/`prompts`/`ai_service`, ale `main.py` to god module, a podwójny montaż routera i GET z efektem ubocznym to błędy projektowe. |
| Backend | **6/10** | Solidne auth, settings, poprawny wybór `def`, filtry `owner_id`; brakuje `response_model`, migracji, typowanych dat i limitów wejścia, a w promptach jest bug z `None`. |
| Frontend | **4/10** | Strict TS i czytelna warstwa API, ale XSS, brak testów i a11y, powielona logika, martwy CSS i niespójna obsługa błędów. |
| Integracja API | **4/10** | Działa na localhost, ale opiera się na ręcznych, rozjechanych typach, ma URL na sztywno, wyświetla 422 jako `[object Object]`, a funkcja `consume` jest niepodłączona. |
| Testy | **5/10** | 70 szybkich, izolowanych testów backendu z dobrymi fixtures, ale ~⅓ „testów bezpieczeństwa” nic nie sprawdza i nie ma żadnego testu frontendu. |
| Bezpieczeństwo | **5/10** | Dobre fundamenty (bcrypt, timing, `jti`, CORS, brak sekretów w repo) przekreślone przez niesanityzowany HTML z LLM przy tokenie w `localStorage` i brak limitów na AI. |
| Utrzymywalność | **4/10** | Brak lintera i type checkera w Pythonie, brak lockfile'a, ~20× `type: ignore`, pozostałości szablonów i rozjechana dokumentacja dla ludzi i agentów. |
| Praca z AI | **4/10** | Pliki instrukcji istnieją, a drugi commit pokazuje realną kontrolę, ale gigantyczne zrzuty, testy-atrapy, wymyślone klasy i niepodłączone funkcje świadczą o akceptowaniu outputu bez weryfikacji. |

---

> [!NOTE]
> **Modern Web Guidance:** próbowałem sprawdzić w `modern-web-guidance` wytyczne dotyczące sanitizacji HTML i dialogów, ale środowisko było offline. Rekomendacje frontendowe (DOMPurify, natywny `<dialog>`, `aria-label`) opierają się na standardowych praktykach, nie na pobranych guide'ach.
