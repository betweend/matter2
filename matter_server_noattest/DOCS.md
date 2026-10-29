# Matter Server (attestation opt-in)

Это **отдельный** Home Assistant add-on, не замена официального приложения
**Matter Server 9.2.0**. При обычной настройке интеграция Matter в HAOS
использует официальный `core_matter_server`. Настройки attestation живут только
здесь; чтобы они работали, интеграцию Matter нужно вручную переключить на
WebSocket этого add-on (порт **5581**).

Полный исходный код Matter Server `1.4.0` включён в `matterjs-server/`;
исправление attestation уже находится в исходниках. Сборка не клонирует сервер
и не загружает его исходный код из сети. Стартовый процесс читает параметры
Supervisor и сразу сбрасывает права; сам Matter Server работает от UID/GID 1000.

## Внимание: ослабление проверки подлинности

Параметр `allow_attestation_failure` по умолчанию выключен. При включении сервер
продолжает комиссионирование при **любых** findings Matter Device Attestation:
например, несовпадении VID в Certification Declaration и BasicInformation,
непроверенной цепочке сертификатов или тестовом сертификате. Каждый обход
пишется в журнал как WARNING вместе с типом и текстом findings. Это существенно
ослабляет проверку подлинности устройств; включайте параметр только для своих
устройств в доверенной сети и только если принимаете этот риск.

`enable_test_net_dcl` — отдельная штатная настройка для доверия тестовым DCL
сертификатам. Она не включает общий обход attestation и не исправляет
несовпадающий VID.

## Установка на Home Assistant OS

1. Сделайте резервную копию Home Assistant и официального Matter Server.
2. Добавьте `https://github.com/betweend/matter2` в **Settings → Add-ons → Add-on
   store → ⋮ → Repositories**.
3. Установите **Matter Server (attestation opt-in)** (версия вида
   `9.2.0-noattest.x`). В списке установленных должны быть **два** приложения:
   официальное **Matter Server 9.2.0** и это. Откройте карточку с суффиксом
   `noattest`, не официальную.
4. В конфигурации **этого** add-on задайте нужные опции (в том числе
   `allow_attestation_failure`) и сохраните. Эти поля есть только здесь.
5. Запустите этот add-on. Он слушает TCP **5581**, поэтому может работать
   одновременно с официальным сервером на 5580. В журнале будет строка
   `WebSocket for the Home Assistant Matter integration: ws://…:5581/ws`.
6. Переключите интеграцию Matter на этот сервер. Иначе HA продолжит ходить в
   `ws://core-matter-server:5580/ws`, и опции этого add-on не задействуются:
   - **Settings → Devices & services → Add integration → Matter**.
   - На HAOS снимите галочку использования официального Matter Server add-on.
   - Укажите URL `ws://<IP-адрес-Home-Assistant>:5581/ws` (тот же адрес, что в
     журнале add-on). Если запись Matter уже есть, этот шаг обновляет её URL и
     ставит `use_addon: false`.
7. После переключения остановите официальный **Matter Server** и выключите у
   него Start on boot / Watchdog. Пока интеграция с `use_addon: true`, HA снова
   поднимет официальный 9.2.0.
8. Запустите комиссионирование из Home Assistant. Проверьте журнал **этого**
   add-on: для каждого пропущенного attestation finding должна появиться запись
   WARNING с типом и описанием проблемы.

Сборка выполняется для `aarch64` и `amd64`. BLE адаптер, если он необходим,
доступен через `host_dbus`/`host_network`; настройки `ble_proxy` и
`bluetooth_adapter_id` сохранены. В боковой панели Ingress пункт называется
**Matter (attestation)**.

### Хранилище и откат

Хранилище add-on привязано к его slug (`matter_server_noattest`). Новый add-on
начинает с отдельной базой, fabric credentials и перечнем узлов; ранее
commissioned устройства сами по себе не появятся. Не удаляйте официальный
add-on и его данные, пока не проверите новый сервер.

Для переноса существующего fabric остановите оба add-on и восстановите в данных
этого add-on резервную копию **всего** каталога данных официального Matter
Server, соблюдая совместимость версий. Не запускайте два сервера с одной копией
базы одновременно.

Чтобы вернуться на официальный сервер: остановите этот add-on, запустите
официальный и снова настройте интеграцию Matter с использованием add-on
(URL `ws://core-matter-server:5580/ws`).

## Параметры

- `allow_attestation_failure` — общий обход отказов device attestation; default
  `false`. Действует только когда интеграция Matter подключена к этому add-on.
- `enable_test_net_dcl` — доверие test-net DCL/OTA сертификатам; default `false`.
- `log_level`, `ble_proxy`, `bluetooth_adapter_id`,
  `default_fabric_label`, `matter_server_args` и `matter_server_env_vars`
  передаются Matter Server.
- `time_sync: on` включает синхронизацию Matter-устройств; `off` отключает.
  `auto` включает её, только если `timedatectl` подтверждает
  `NTPSynchronized=yes` на хосте. Если статус не удаётся получить, журнал
  содержит предупреждение, а синхронизация остаётся выключенной.

## Сборка

Весь исходный код, необходимый для сборки Matter Server, хранится в каталоге
`matterjs-server/` в этом репозитории. Образ устанавливает npm-зависимости из
включённого lock-файла и выполняет сборку из локальных файлов. Для получения
самого исходного кода Matter Server доступ к GitHub во время Docker build не
требуется.
