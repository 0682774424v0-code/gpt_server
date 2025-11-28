# 🤝 Гайд для контрибютерів (Contributing)

Велькамі до нашої спільноти! Ми раді, що ви хочете допомогти покращити проект.

## 📋 Кодекс поведінки

Будь ласка, будьте поважливі та конструктивні при взаємодії з іншими контрибютерами.

## 🚀 Як почати

### 1. Fork репозиторія
```bash
# Натисніть "Fork" кнопку на GitHub
```

### 2. Клонуйте свій fork
```bash
git clone https://github.com/YOUR-USERNAME/gpt_server.git
cd gpt_server
```

### 3. Додайте upstream
```bash
git remote add upstream https://github.com/0682774424v0-code/gpt_server.git
```

### 4. Створіть feature branch
```bash
git checkout -b feature/your-feature-name
```

## 📝 Процес розробки

### Python Code

#### Style Guide (PEP 8)
```python
# ✅ GOOD
def generate_image(
    prompt: str,
    width: int = 512,
    height: int = 512,
    steps: int = 20
) -> Image.Image:
    """Generate image from prompt.
    
    Args:
        prompt: Text prompt for generation
        width: Image width
        height: Image height
        steps: Number of inference steps
        
    Returns:
        Generated PIL Image
    """
    # Implementation
    pass

# ❌ BAD
def gen_img(p, w=512, h=512, s=20):
    # no docstring
    pass
```

#### Встановіть linter
```bash
pip install flake8 black isort

# Run formatters
black colab_server.py
isort colab_server.py
flake8 colab_server.py
```

### JavaScript Code

#### Style Guide
```javascript
// ✅ GOOD
async function generateImage(config) {
    /**
     * Generate image with WebSocket
     * @param {Object} config - Configuration object
     * @returns {Promise} Generated image data
     */
    try {
        const result = await socket.emit('generate', config);
        return result;
    } catch (error) {
        console.error('Generation failed:', error);
        throw error;
    }
}

// ❌ BAD
async function gen(c) {
    // no comments
    return socket.emit('generate', c);
}
```

### HTML/CSS

#### Best Practices
```html
<!-- ✅ GOOD: Semantic HTML -->
<section class="generation-panel">
    <h2>Image Generation</h2>
    <form aria-label="Image generation form">
        <label for="prompt-input">Prompt</label>
        <input id="prompt-input" type="text" />
    </form>
</section>

<!-- ❌ BAD: Non-semantic -->
<div class="section1">
    <div class="title">Image Generation</div>
    <div class="form"></div>
</div>
```

## ✅ Перед Pull Request

1. **Тести**
```bash
# Python: Run any tests
python -m pytest tests/

# JavaScript: Validate syntax
npm run lint  # якщо налаштовано
```

2. **Документація**
   - Оновіть README.md якщо потрібно
   - Додайте docstrings для нових функцій
   - Оновіть comments
   - Задокументуйте API змін

3. **Commit messages**
```bash
# Добрий commit message
git commit -m "feat: Add support for SDXL models

- Add SDXL pipeline loading
- Update model downloader
- Add tests for new feature"

# Не робіть так
git commit -m "fix stuff"
```

4. **Щоб синхронізуватися з upstream**
```bash
git fetch upstream
git rebase upstream/main
```

5. **Останній push**
```bash
git push origin feature/your-feature-name
```

## 📤 Відкрийте Pull Request

1. Перейдіть на GitHub fork
2. Натисніть "New Pull Request"
3. Виберіть `upstream/main` як base
4. Заповніть PR template:
   - Опис змін
   - Чому це потрібно
   - Як це тестувати
   - Screenshots (якщо UI зміни)

## 🔄 PR Review Процес

1. **Автоматичні чеки**
   - GitHub Actions перевіряє код
   - Linting (flake8 для Python)
   - Build процес

2. **Ручний review**
   - Код review від maintainer
   - Пропозиції поліпшень
   - Запити змін якщо потрібно

3. **Merge**
   - При approvalу - merge PR
   - Ваша фіча додається в main!

## 🐛 Звітування про баги

Знайшли баг?

1. Перевірте [Issues](https://github.com/0682774424v0-code/gpt_server/issues)
2. Якщо не існує - створіть новий
3. Використайте Bug Report template
4. Опишіть:
   - Кроки для відтворення
   - Очікуваний результат
   - Фактичний результат
   - Середовище (OS, Python версія, GPU)

## 💡 Пропозиції

Є ідея для нової фіч?

1. Перевірте [Discussions](https://github.com/0682774424v0-code/gpt_server/discussions)
2. Відкрийте issue з Feature Request template
3. Опишіть:
   - Що потрібно
   - Чому це потрібно
   - Можливе рішення

## 📚 Напрями для контрибютерів

**Потрібна допомога з:**

- [ ] 🐛 **Bugfix** - Виправлення існуючих багів
- [ ] ✨ **Features** - Нові фічі та покращення
- [ ] 📚 **Docs** - Оновлення документації
- [ ] 🌐 **Localization** - Переклади (українська, англійська тощо)
- [ ] 🧪 **Testing** - Добавити unit тести
- [ ] 🎨 **UI/UX** - Поліпшення інтерфейсу
- [ ] ⚡ **Performance** - Оптимізація

## 🎯 Поточні пріоритети

Дивіться [ROADMAP](README.md#-план-розвитку-roadmap) у README для довгострокових планів.

## 💬 Питання?

- Відкрийте issue з меткою `question`
- Напишіть в [Discussions](https://github.com/0682774424v0-code/gpt_server/discussions)
- Контактуйте з maintainers

## 📋 Чек-лист для контрибютера

Перед відправкою PR:

- [ ] Мої зміни виконуються локально
- [ ] Я запустив linter/formatter
- [ ] Я не порушив існуючий функціонал
- [ ] Я додав комментарі до складного кода
- [ ] Я оновив документацію
- [ ] Я додав commit з хорошим описом
- [ ] Я синхронізував з upstream/main

## 🙏 Спасибі!

Велькамі будь-яку допомогу! Ваша контрибюція робить цей проект кращим для всіх.

---

**Happy Contributing! 🚀**
