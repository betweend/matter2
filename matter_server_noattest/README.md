# Локальный Matter Server add-on

Это отдельное приложение Home Assistant, не официальный Matter Server. Полный
исходный код включён в каталог `matterjs-server/` и уже содержит opt-in
исправление обработки attestation findings. Dockerfile собирает его локально.

Добавьте `https://github.com/betweend/matter2` в **Settings → Add-ons → Add-on
store → ⋮ → Repositories**, установите **Matter Server (attestation opt-in)** и
переключите интеграцию Matter на `ws://<IP-Home-Assistant>:5581/ws`. Руководство
и предупреждения безопасности: [DOCS.md](DOCS.md).
