# Stable Diffusion WebUI - Complete Documentation

## 📋 Огляд

Цей проект являє собою повнофункціональний веб-додаток для Stable Diffusion з підтримкою:
- **Текст в зображення (txt2img)**
- **Зображення в зображення (img2img)**
- **Inpainting з інтерактивним canvas редактором**
- **ControlNet** з 7+ типами preprocessors
- **IP-Adapter** для стилізації
- **LoRA** (до 7 моделей одночасно)
- **Upscaling** (ESRGAN, RealESRGAN, DAT)
- **Adetailer** для покращення деталей
- **Face Restoration** (CodeFormer, GFPGAN)
- **Google Drive синхронізація**
- **Офлайн підтримка** через Service Worker

## 🚀 Швидкий Старт

### Вимоги
- Google Colab (бажано) або локальна машина з GPU
- Python 3.9+
- 10GB+ вільної пам'яті GPU

### Установка на Google Colab

```python
# 1. Завантажте setup скрипт
!curl -O https://raw.githubusercontent.com/your-repo/setup_colab.sh
!chmod +x setup_colab.sh

# 2. Запустіть setup
!bash setup_colab.sh

# 3. Завантажте backend
!curl -O https://raw.githubusercontent.com/your-repo/colab_server.py

# 4. Запустіть Flask сервер
!python colab_server.py
```

### Установка локально

```bash
# 1. Клонуйте репозиторій
git clone https://github.com/your-repo/stable-diffusion-webui
cd stable-diffusion-webui

# 2. Створіть virtual environment
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate

# 3. Встановіть залежності
pip install -r requirements.txt

# 4. Запустіть сервер
python colab_server.py

# 5. Відкрийте у браузері
# Якщо frontend локально: просто відкрийте index.html
# Якщо на GitHub Pages: перейдіть на вашу сторінку
```

## 📁 Структура Проекту

```
stable-diffusion-webui/
├── Backend (Python)
│   ├── colab_server.py           # Flask WebSocket сервер
│   ├── setup_colab.sh            # Коlab setup скрипт
│   └── requirements.txt          # Python залежності
│
├── Frontend (HTML/CSS/JS)
│   ├── index.html                # Основна HTML сторінка
│   ├── app.js                    # Основна логіка + WebSocket клієнт
│   ├── canvas_editor.js          # Inpaint canvas редактор
│   ├── gallery.js                # Управління галереєю
│   ├── gdrive_sync.js            # Google Drive синхронізація
│   ├── service-worker.js         # Офлайн підтримка
│   └── styles.css                # Responsive стилізація
│
└── Документація
    └── README.md                 # Цей файл
```

## 🔧 Конфігурація

### Backend (colab_server.py)

Основні змінні середовища:

```python
# Порт сервера
os.environ.get('PORT', 5000)

# Шлях до моделей
os.environ.get('MODELS_PATH', './models')

# Секретний ключ Flask
os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
```

### Frontend Конфігурація (app.js)

```javascript
const CONFIG = {
    SERVER_URL: window.location.origin,  // URL сервера
    WS_TIMEOUT: 30000,                   // Timeout вебсокета
    MAX_TOAST_QUEUE: 5,                  // Макс кількість повідомлень
    LORA_SLOTS: 7,                       // Кількість LoRA слотів
    AUTO_RECONNECT_INTERVAL: 5000,       // Інтервал переконекту
};
```

## 🌐 Розгортання

### На GitHub Pages

```bash
# 1. Створіть репозиторій
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/stable-diffusion-webui
git push -u origin main

# 2. Увімкніть GitHub Pages
# Settings > Pages > Deploy from branch > main

# 3. Оновіть SERVER_URL в app.js на ваш сервер URL
# Через Cloudflare Tunnel або вашого хоста
```

### З Cloudflare Tunnel (Colab)

```python
# У Colab cell:
!wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
!chmod +x cloudflared-linux-amd64
!./cloudflared-linux-amd64 tunnel --url http://localhost:5000
```

Скопіюйте надану URL і використовуйте її як `SERVER_URL` у фронтенді.

### З Docker

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY colab_server.py .

EXPOSE 5000

CMD ["python", "colab_server.py"]
```

```bash
docker build -t stable-diffusion-webui .
docker run -p 5000:5000 stable-diffusion-webui
```

## 🔌 WebSocket API

### Клієнт -> Сервер

#### Генерація зображень

```javascript
ws.send({
    action: "generate",
    params: {
        prompt: "a beautiful landscape",
        negative_prompt: "blurry, low quality",
        task: "txt2img",        // txt2img, img2img, inpaint, controlnet_*
        model: "runwayml/stable-diffusion-v1-5",
        width: 512,
        height: 512,
        steps: 20,
        cfg_scale: 7.5,
        sampler: "euler",       // euler, euler_ancestral, dpm, lms
        scheduler: "normal",    // normal, karras, exponential
        seed: -1,               // -1 для random
        
        // Опціонально
        image: base64String,                    // для img2img/inpaint
        mask: base64String,                     // для inpaint
        strength: 0.75,                         // для img2img/inpaint
        
        // LoRA
        loras: [
            { name: "lora1", weight: 1.0 },
            { name: "lora2", weight: 0.8 }
        ],
        
        // Advanced
        clip_skip: 0,
        freeu_beta: 0,
        pag_scale: 0,
        
        // ControlNet
        controlnet: {
            type: "canny",
            weight: 1.0,
            start_percent: 0,
            stop_percent: 1.0,
            preprocessor_resolution: 512,
            // Специфічні параметри
            canny_low: 100,
            canny_high: 200
        }
    }
})
```

#### Інші команди

```javascript
// Отримати список моделей
ws.send({ action: "get_models" })

// Завантажити модель
ws.send({
    action: "download_model",
    url: "https://huggingface.co/...",
    type: "checkpoint"  // checkpoint, lora, vae
})

// Отримати галерею
ws.send({
    action: "get_gallery",
    page: 0,
    limit: 20
})

// Скасувати генерацію
ws.send({ action: "cancel_generation" })

// Покращити prompt
ws.send({
    action: "enhance_prompt",
    prompt: "a cat"
})

// Upscaling
ws.send({
    action: "upscale_image",
    image: base64String,
    scale: 2,
    method: "esrgan"  // esrgan, realesrgan, dat
})

// Adetailer
ws.send({
    action: "adetailer",
    image: base64String,
    // параметри...
})
```

### Сервер -> Клієнт

#### Progress

```javascript
{
    type: "progress",
    data: {
        step: 5,
        total: 20,
        status: "Generating...",
        preview: base64String  // опціонально
    }
}
```

#### Complete

```javascript
{
    type: "complete",
    data: {
        images: [base64String1, base64String2],
        metadata: {
            prompt: "...",
            seed: 12345,
            // ... все параметри генерації
        },
        paths: ["/outputs/gen_123_456.png"],
        gdrive_ids: ["file_id_1", "file_id_2"]
    }
}
```

#### Error

```javascript
{
    type: "error",
    message: "Опис помилки"
}
```

## 🎨 Особливості UI

### Generation Tab
- Динамічне введення prompt
- Selector моделей (SDXL, SD1.5, Flux)
- Preset розмірів (512x512, 768x768, 1024x1024)
- Параметри: Steps, CFG, Sampler, Scheduler
- Random seed генератор
- Управління LoRA (до 7)
- Drag & drop upload
- Live preview під час генерації

### Inpaint Tab
- Інтерактивний canvas
- Brush & Eraser інструменти
- Регульований розмір brush
- Clear canvas
- Strength slider
- Preview original/mask

### ControlNet Tab
- 8+ типів preprocessors
- Динамічні параметри на тип
- Control weight, start/stop %
- Резолюція препроцесора

### Gallery Tab
- Grid layout з thumbnail
- Пагінація
- Фільтрація по задачі
- Пошук по prompt
- Масове завантаження
- Favorite система
- Metadata viewer
- Google Drive синхронізація

### Settings Tab
- Завантаження моделей (Civitai, HuggingFace)
- Управління моделями
- Генерація параметрів
- Advanced настройки (precision, optimization)
- Google Drive інтеграція

## 🔐 Безпека

### Rate Limiting

Сервер автоматично обмежує запити:
- 100 запитів за 60 секунд на клієнт

### Input Validation

Усі вхідні дані валідуються:
- Максимальна довжина 10,000 символів
- Санітизація імен файлів
- Перевірка типів даних

### CORS

Вебсокет дозволяє всі origem (налаштуйте для production):

```python
socketio = SocketIO(app, cors_allowed_origins="*")
```

## 📱 Мобільна підтримка

- Responsive design для всіх розмірів екрана
- Touch events для canvas редактора
- Мобільне меню
- Оптимізовані кнопки для тач

## 🖴 Офлайн Підтримка

Service Worker забезпечує:
- Кешування статичних файлів
- Offline fallback page
- Background sync
- IndexedDB для локального зберігання

## 🌙 Теми

### Темна тема

```javascript
document.body.classList.add('dark-theme');
localStorage.setItem('theme', 'dark');
```

Тема зберігається в localStorage.

## 📊 Google Drive Integration

### Перша настройка

1. Сервер запросить дозвіл на доступ до Google Drive
2. Дозвіл буде збережено для майбутніх сесій
3. Зображення автоматично синхронізуватимуться

### Структура папок

```
StableDiffusion_Gallery/
├── 2024/
│   ├── 01/
│   │   ├── 01/
│   │   │   ├── 1704067200_12345.png
│   │   │   └── (metadata в описі файлу)
```

### Синхронізація

- Автоматична кожні 5 хвилин
- Ручна кнопка синхронізації
- Статус індикатор
- Backup/Restore функції

## 🐛 Debugging

### Консоль браузера

```javascript
// Перевірити стан WebSocket
console.log(wsManager.socket);

// Перевірити стан додатку
console.log(appState);

// Перевірити галерею
console.log(galleryManager.items);
```

### Backend логи

```bash
# Увімкніть debug mode
export FLASK_ENV=development
python colab_server.py

# Логи розміщуються в console
```

## 🚨 Розповсюджені Проблеми

### WebSocket не підключається

**Проблема:** "Failed to connect WebSocket"

**Рішення:**
1. Перевірьте, що сервер запущений
2. Переконайтеся, що SERVER_URL правильна
3. Перевірьте CORS налаштування
4. Перевірьте файрвол

### Модель не завантажується

**Проблема:** "Model loading failed"

**Рішення:**
1. Перевірьте GPU пам'ять (`nvidia-smi`)
2. Очистіть кеш: `torch.cuda.empty_cache()`
3. Спробуйте меншу модель спочатку

### Google Drive не синхронізується

**Проблема:** "Google Drive sync failed"

**Рішення:**
1. Переконайтеся, що дали дозвіл на доступ
2. Перевірьте активне интернет з'єднання
3. Перевірьте квоту Google Drive

## 📚 Додаткові Ресурси

- [Stable Diffusion Документація](https://huggingface.co/docs/diffusers)
- [ControlNet Гайд](https://github.com/lllyasviel/ControlNet)
- [Civitai Моделі](https://civitai.com)
- [Hugging Face Models](https://huggingface.co/models)

## 💡 Tips & Tricks

### Швидка генерація
1. Зменшіть steps (10-15)
2. Використовуйте fp16 precision
3. Вмикніть CUDA optimizations

### Краще якість
1. Збільшіть steps (40-50)
2. Використовуйте fp32 precision
3. Збільшіть CFG scale (8-12)

### Спеціальні ефекти
1. Використовуйте LoRA для стилів
2. ControlNet для композиції
3. IP-Adapter для персональних стилів

## 🤝 Внески

Велькамі PR з покращеннями!

## 📄 Ліцензія

MIT License - див. LICENSE файл

## 👥 Автор

創作者: [Ваше Ім'я]
GitHub: [Ваш GitHub]
Email: [Ваш Email]

---

## 🎯 План Розвитку (Roadmap)

- [ ] WebUI для моделей SD3
- [ ] Flux підтримка
- [ ] Batch processing CSV
- [ ] X/Y/Z plot для параметрів
- [ ] Комунальне видіння у real-time
- [ ] Мобільна app (React Native)
- [ ] Cloud deployment (AWS, GCP)
- [ ] Multi-GPU підтримка
- [ ] Queue management GUI
- [ ] Advanced model merging

---

**Остання оновлення:** Листопад 28, 2024

Для більш інформації і проблеми, відвідайте [Issues](https://github.com/your-repo/issues) сторінку.
