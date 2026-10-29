# Changelog

## 9.2.0-noattest.8

- Keep the Supervisor-mounted data directory writable by running Matter Server with the container's default root user.
- Remove the custom recursive ownership change and privilege drop.

## 9.2.0-noattest.7

- Fix ownership of the Supervisor-mounted data directory before dropping privileges.

## 9.2.0-noattest.6

- Read Supervisor options before dropping privileges, then run the server as UID/GID 1000.

## 9.2.0-noattest.5

- Remove the invalid boolean watchdog setting; Supervisor watchdog expects a URL.
- Publish this release from the `matter2` repository.

## 9.2.0-noattest.4

- Run as a separate add-on on TCP 5581 so it can start next to official Matter Server 9.2.0.
- Surface attestation options in this add-on's configuration UI (not the official app).
- Log the WebSocket URL the Matter integration must use, and warn if `core_matter_server` is still the integration target.
