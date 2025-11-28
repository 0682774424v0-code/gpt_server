# 📚 GitHub Repository Guide

## 🔄 Синхронізація з GitHub

### Налаштування
```bash
# 1. Клонуйте репозиторій
git clone https://github.com/0682774424v0-code/gpt_server
cd gpt_server

# 2. Налаштуйте upstream (якщо working з fork)
git remote add upstream https://github.com/0682774424v0-code/gpt_server

# 3. Створіть feature branch
git checkout -b feature/your-feature-name
```

### Робочий процес

#### 1. Зміни на локальній машині
```bash
# Оновіть файли
# Наприклад, оновіть colab_server.py, app.js тощо

# Перевірте статус
git status

# Додайте змін
git add .
# або конкретні файли
git add colab_server.py app-api-keys.js
```

#### 2. Коміт
```bash
# З описовим повідомленням
git commit -m "feat: Add new feature description"

# Формат:
# feat: Нова фіча
# fix: Виправлення багу
# docs: Документація
# style: Форматування кода
# refactor: Переробка кода
# test: Тести
```

#### 3. Push на GitHub
```bash
# Для нового branch
git push -u origin feature/your-feature-name

# Для існуючого branch
git push
```

#### 4. Pull Request
- Перейдіть на https://github.com/0682774424v0-code/gpt_server
- Натисніть "New Pull Request"
- Виберіть ваш branch
- Опишіть зміни
- Чекайте review

### Синхронізація з основним репозиторієм

```bash
# Отримайте останні зміни з main
git fetch upstream
git rebase upstream/main

# Або якщо не налаштовано upstream
git pull origin main
```

## 📋 Структура GitHub репозиторія

```
.github/
├── workflows/
│   └── deploy.yml           # CI/CD pipeline для GitHub Pages
├── ISSUE_TEMPLATE/
│   ├── bug_report.md        # Шаблон для багів
│   └── feature_request.md   # Шаблон для фіч
└── PULL_REQUEST_TEMPLATE.md # Шаблон для PR

project-root/
├── Frontend files
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── ...
├── Backend files
│   ├── colab_server.py
│   ├── requirements.txt
│   └── ...
└── Documentation
    ├── README.md
    ├── QUICKSTART.md
    └── ...
```

## 🚀 GitHub Pages Deployment

### Автоматичне розгортання
- При push на `main` гілку GitHub Actions:
  1. Перевіряє код
  2. Будує frontend
  3. Розгортає на GitHub Pages

### Ручне розгортання

```bash
# 1. Переконайтеся, що все закомічено
git status

# 2. Push на main
git push origin main

# 3. Перейдіть на Settings → Pages
# 4. Виберіть "Deploy from a branch"
# 5. Гілка: main, папка: root
# 6. GitHub Pages буде готов за 1-2 хвилини
```

## 🔗 Корисні посилання

- **Repository**: https://github.com/0682774424v0-code/gpt_server
- **GitHub Pages Site**: https://0682774424v0-code.github.io/gpt_server/
- **Issues**: https://github.com/0682774424v0-code/gpt_server/issues
- **Discussions**: https://github.com/0682774424v0-code/gpt_server/discussions

## 📝 Commit Messages

### Приклади добрих commit messages:

```
feat: Add LoRA support with up to 7 models
fix: Fix checkpointProgress not showing
docs: Update GitHub Pages deployment guide
refactor: Optimize WebSocket handlers
style: Format code to PEP 8 standards
test: Add unit tests for model downloader
```

### Приклади поганих commit messages:

```
❌ "update"
❌ "fix bug"
❌ "blah"
❌ "work in progress"
```

## 🔐 Security

### Do's:
- ✅ Використовуйте `.env.example` для публічних змінних
- ✅ Зберігайте sensitive keys в GitHub Secrets
- ✅ Регулярно оновлюйте залежності
- ✅ Робіть кодревью для критичних змін

### Don'ts:
- ❌ Не коммітьте `.env` файли з реальними ключами
- ❌ Не публікуйте API keys в коду
- ❌ Не завантажуйте модельні файли в Git (використовуйте .gitignore)
- ❌ Не коммітьте `/outputs` або `/models` папки

## 📦 Управління залежностями

### Python
```bash
# Оновіть requirements.txt
pip install --upgrade package-name
pip freeze > requirements.txt
git add requirements.txt
git commit -m "deps: Update package-name to version X.Y.Z"
```

### JavaScript
```bash
# Файли JavaScript включені прямо в HTML
# Перевіряйте версії CDN в index.html
```

## 🐛 Звітування про проблеми

Якщо знайдете помилку:

1. Перейдіть на Issues
2. Натисніть "New Issue"
3. Виберіть шаблон (Bug Report)
4. Заповніть:
   - Опис проблеми
   - Кроки для відтворення
   - Очікуваний результат
   - Фактичний результат
   - Скрінші/логи

## 💡 Пропозиції нових фіч

1. Перейдіть на Issues
2. Натисніть "New Issue"
3. Виберіть "Feature Request"
4. Опишіть нову фічу та чому вона потрібна

## 🤝 Внески

Велькамі до PR! Алгоритм:

1. Fork репозиторія
2. Створіть feature branch
3. Зробіть зміни
4. Push на fork
5. Відкрийте Pull Request
6. Чекайте review

## 📚 Додаткові ресурси

- [GitHub Docs](https://docs.github.com/)
- [Git Cheat Sheet](https://github.github.com/training-kit/downloads/github-git-cheat-sheet.pdf)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
