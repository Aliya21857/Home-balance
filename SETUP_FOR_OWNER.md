# Настройка «Дома баланса»

## Firebase

1. В Firebase Console создайте проект и Web App.
2. В Authentication → Sign-in method включите Email/Password.
3. В Authentication → Users вручную создайте единственный аккаунт владельца. Публичной регистрации на сайте нет.
4. Создайте Firestore Database. Коллекции вручную создавать не нужно.

## Конфигурация

Скопируйте `.env.example` в `.env.local`, разложите Firebase Web Config по соответствующим строкам и вставьте UID владельца из Authentication → Users в `VITE_OWNER_UID`. Пароль пользователя в файлы не добавляйте.

## Правила Firestore

В `firestore.rules` замените `OWNER_UID_PLACEHOLDER` на UID владельца. Затем откройте `Firestore Database → Rules`, вставьте содержимое файла и нажмите Publish. Пока placeholder не заменён, доступ закрыт всем.

## Локальный запуск

```bash
npm install
npm run dev
```

## GitHub Pages

1. Отправьте проект в ветку `main` GitHub-репозитория.
2. В Settings → Pages выберите Source: GitHub Actions.
3. Передайте Vite-переменные Firebase в шаг build через GitHub Actions repository variables/secrets.
4. В Firebase Authentication → Settings → Authorized domains добавьте `USERNAME.github.io` — без `https://` и имени репозитория.

Workflow `.github/workflows/deploy.yml` публикует `dist`. Настройка Vite `base: './'` поддерживает адрес `https://USERNAME.github.io/REPOSITORY/`.

## Обновления и ошибки

Перед отправкой выполните `npm run lint` и `npm run build`, затем отправьте изменения в `main`.

- «Firebase ещё не настроен» — заполните `.env.local` и перезапустите сервер.
- «У этого аккаунта нет доступа» — проверьте `VITE_OWNER_UID`.
- Permission denied — проверьте UID в `firestore.rules` и снова опубликуйте правила.
- Вход не работает на Pages — проверьте Authorized domains.
