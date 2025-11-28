# 📊 Синхронізація версій та Releases

## 🔄 Git Workflow для підтримки

### Initial Setup (один раз)

```bash
# 1. Клонуйте репозиторій
git clone https://github.com/0682774424v0-code/gpt_server
cd gpt_server

# 2. Налаштуйте конфіг (опціонально)
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Повсякденна Розробка

#### Отримання останніх змін
```bash
# Переконайтеся, що ви на main
git checkout main

# Отримайте оновлення
git pull origin main

# Або якщо ви хочете перевірити, що змінилось
git fetch origin
git log origin/main --oneline -10
```

#### Створення нового feature
```bash
# Оновіть main перед створенням branch
git checkout main
git pull origin main

# Створіть feature branch
git checkout -b feature/descriptive-name

# Наприклад:
git checkout -b feature/add-sdxl-support
git checkout -b fix/checkpointProgress-bug
git checkout -b docs/update-readme
```

#### Коммітування змін
```bash
# Переглянути змін
git status
git diff

# Додайте специфічні файли
git add colab_server.py app.js styles.css

# Або все
git add .

# Коммітьте з хорошим описом
git commit -m "feat: Add SDXL support

- Added SDXL pipeline loading
- Updated model downloader  
- Added configuration UI"
```

#### Push до репозиторія
```bash
# Для нового branch
git push -u origin feature/descriptive-name

# Для існуючого branch
git push

# Перевірте статус
git log --oneline -5
```

### Syncing Fork з Upstream

Якщо ви маєте fork:

```bash
# Додайте upstream (якщо не додано)
git remote add upstream https://github.com/0682774424v0-code/gpt_server
git remote -v  # Перевірте

# Отримайте оновлення
git fetch upstream

# Merge в ваш local main
git checkout main
git merge upstream/main

# Push до вашого fork
git push origin main
```

## 📦 Versioning

Використовуємо [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
1.2.3
│ │ │
│ │ └─ PATCH: Bug fixes (increment for hotfixes)
│ └─── MINOR: New features (backward compatible)
└───── MAJOR: Breaking changes
```

### Приклади:
- `1.0.0` - Перший реліз
- `1.1.0` - Нова фіча (добавив ControlNet)
- `1.1.1` - Bug fix (виправив progress bar)
- `2.0.0` - Breaking change (нова архітектура)

## 🏷️ GitHub Releases

### Створення нового Release

```bash
# 1. Переконайтеся, що ви на main
git checkout main
git pull origin main

# 2. Додайте тег
git tag v1.2.0

# 3. Напишіть release notes
# Push тег
git push origin v1.2.0
```

Потім на GitHub:
1. Перейдіть на [Releases](https://github.com/0682774424v0-code/gpt_server/releases)
2. Натисніть "Create a release"
3. Виберіть тег: v1.2.0
4. Напишіть Release Notes:
   ```markdown
   ## What's New ✨
   - Added SDXL support
   - Improved progress tracking
   
   ## Bug Fixes 🐛
   - Fixed canvas editor crashes
   - Fixed model download progress
   
   ## Breaking Changes ⚠️
   - Removed old API endpoints
   ```
5. Натисніть "Publish release"

## 🔍 Корисні Git команди

```bash
# Переглядіть історію commits
git log --oneline --graph

# Переглядіть конкретний commit
git show abc123

# Перевірте, які файли змінились
git diff HEAD~1

# Скасуйте останній commit (не push)
git reset --soft HEAD~1

# Скасуйте всі локальні зміни
git reset --hard origin/main

# Створіть новий branch від певного commit
git checkout -b new-branch abc123

# Злийте branch в main
git checkout main
git merge feature/branch-name

# Видаліть локальний branch
git branch -d feature/branch-name

# Видаліть remote branch
git push origin --delete feature/branch-name

# Перейменуйте branch
git branch -m old-name new-name
git push origin :old-name new-name

# Перевірте останні 10 commits
git log --oneline -10

# Пошук в історії
git log --grep="keyword"

# Diff між branches
git diff main feature/branch-name

# Status скорочено
git status -s

# Stage конкретну частину файлу (interactive)
git add -p

# Stash (тимчасово збережіть) зміни
git stash
git stash list
git stash pop

# Cherry-pick специфічний commit
git cherry-pick abc123
```

## 🚀 Workflow для Release

```bash
# 1. Приготуйте release branch
git checkout -b release/v1.2.0

# 2. Оновіть version в файлах
# (якщо є version.txt, package.json тощо)

# 3. Оновіть CHANGELOG.md
# (документуйте всі зміни)

# 4. Коммітьте
git commit -m "release: v1.2.0"

# 5. Merge в main
git checkout main
git merge --no-ff release/v1.2.0

# 6. Додайте тег
git tag -a v1.2.0 -m "Version 1.2.0"

# 7. Push все
git push origin main
git push origin release/v1.2.0
git push origin v1.2.0

# 8. Видаліть release branch
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0

# 9. Merge назад в develop якщо маєте
git checkout develop
git merge main
git push origin develop
```

## 📝 .gitconfig Рекомендації

```bash
# Встановіть глобальні налаштування
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Облегши алісеси (shortcuts)
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual 'log --graph --oneline --all'

# Рекомендовані налаштування
git config --global core.editor "code"  # Використовуйте VS Code
git config --global pull.rebase false   # Merge вместо rebase
git config --global core.autocrlf true  # Windows: handle line endings
```

## 🔐 Security

### Приватні файли
Додайте в `.gitignore`:
```
.env
.env.local
secret_keys.txt
*.pem
*.key
```

### Не коммітьте:
- 🚫 API keys
- 🚫 Passwords
- 🚫 Private tokens
- 🚫 Модельні файли (> 100MB)
- 🚫 Output papки

## 📊 Інші Корисні Команди

```bash
# Скільки commits кожен автор?
git shortlog -sn

# Статистика проекту
git log --shortstat

# Найбільші changes
git log --stat

# Дата першого commit
git log --diff-filter=A --name-only --pretty=format: | grep -o '[^/]*$' | sort -u | head -1

# День з найбільшим commits
git log --date=short --pretty=format:"%ad" | sort | uniq -c | sort -nr | head -1
```

---

**Happy Coding! 🚀**
