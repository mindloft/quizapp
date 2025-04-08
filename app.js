document.addEventListener("DOMContentLoaded", function() {
    // Элементы страницы
    const startScreen = document.getElementById("startScreen");
    const quizScreen = document.getElementById("quizScreen");
    let questionText = document.getElementById("questionText");
    let optionsContainer = document.getElementById("optionsContainer");
    let progressCounter = document.getElementById("progressCounter");
    let prevButton = document.getElementById("prevButton");
    let nextButton = document.getElementById("nextButton");
    const startButton = document.getElementById("startButton");

    // Данные опроса
    const quizData = [
        {
            question: "Любите ли вы путешествовать?",
            type: "single",
            options: ["Да", "Нет", "Иногда"]
        },
        {
            question: "Какие жанры фильмов вам нравятся?",
            type: "multiple",
            options: ["Комедия", "Драма", "Фантастика", "Ужасы"]
        },
        {
            question: "Кофе или чай?",
            type: "single",
            options: ["Кофе", "Чай", "Не пью ни того, ни другого"]
        }
    ];

    let currentQuestionIndex = 0;
    let userAnswers = quizData.map(q => q.type === "multiple" ? [] : null);

    // Проверка URL на ответы друга
    const urlParams = new URLSearchParams(window.location.search);
    const friendAnswersEncoded = urlParams.get('answers');

    if (friendAnswersEncoded) {
        try {
            const friendAnswers = JSON.parse(atob(friendAnswersEncoded));
            startScreen.style.display = "none";
            quizScreen.style.display = "block";
            showComparisonScreen(friendAnswers);
            return;
        } catch (e) {
            console.error("Ошибка загрузки ответов друга:", e);
        }
    }

    // Инициализация
    startButton.addEventListener("click", startQuiz);
    prevButton.addEventListener("click", goToPreviousQuestion);
    nextButton.addEventListener("click", goToNextQuestion);

    function startQuiz() {
        startScreen.style.display = "none";
        quizScreen.style.display = "block";
        showQuestion(currentQuestionIndex);
    }

    function showQuestion(index) {
        const question = quizData[index];
        questionText.textContent = question.question;

        progressCounter.textContent = `Вопрос ${index + 1} из ${quizData.length}`;
        optionsContainer.innerHTML = "";

        question.options.forEach((option, i) => {
            const button = document.createElement("button");
            button.className = `option ${question.type === "multiple" ? "multiple" : ""}`;
            button.textContent = option;
            button.addEventListener("click", () => handleOptionSelect(i));
            optionsContainer.appendChild(button);
        });

        highlightSelectedOptions();
        updateNavigation();
    }

    function handleOptionSelect(optionIndex) {
        const question = quizData[currentQuestionIndex];

        if (question.type === "multiple") {
            const answers = userAnswers[currentQuestionIndex] || [];
            userAnswers[currentQuestionIndex] = answers.includes(optionIndex)
                ? answers.filter(i => i !== optionIndex)
                : [...answers, optionIndex];
        } else {
            userAnswers[currentQuestionIndex] = optionIndex;
        }

        highlightSelectedOptions();
        updateNavigation();
    }

    function highlightSelectedOptions() {
        const question = quizData[currentQuestionIndex];
        const options = document.querySelectorAll('.option');

        options.forEach((option, index) => {
            option.classList.remove('selected');

            if (question.type === "multiple") {
                const answers = userAnswers[currentQuestionIndex] || [];
                if (answers.includes(index)) {
                    option.classList.add('selected');
                }
            } else {
                if (userAnswers[currentQuestionIndex] === index) {
                    option.classList.add('selected');
                }
            }
        });
    }

    function updateNavigation() {
        prevButton.disabled = currentQuestionIndex === 0;

        const question = quizData[currentQuestionIndex];

        if (currentQuestionIndex === quizData.length - 1) {
            nextButton.textContent = "Завершить";
        } else {
            nextButton.textContent = "Вперёд →";
        }

        if (question.type === "single") {
            nextButton.disabled = userAnswers[currentQuestionIndex] === null;
        } else {
            const hasAnswers = userAnswers[currentQuestionIndex] && userAnswers[currentQuestionIndex].length > 0;
            nextButton.disabled = !hasAnswers;
        }
    }

    function goToPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion(currentQuestionIndex);
        }
    }

    function goToNextQuestion() {
        const question = quizData[currentQuestionIndex];

        if (question.type === "single" && userAnswers[currentQuestionIndex] === null) {
            return;
        }

        if (question.type === "multiple" && (!userAnswers[currentQuestionIndex] || userAnswers[currentQuestionIndex].length === 0)) {
            return;
        }

        if (currentQuestionIndex < quizData.length - 1) {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        } else {
            showCompletionScreen();
        }
    }

    function showCompletionScreen() {
        quizScreen.innerHTML = `
            <div class="completion-screen">
                <h2>Опрос завершён!</h2>
                <p>Хотите сравнить ответы с другом?</p>
                <button id="sendButton" class="nav-button">Отправить другу</button>
                <button id="restartButton" class="nav-button secondary">Пройти ещё раз</button>
            </div>
        `;

        document.getElementById("restartButton").addEventListener("click", restartQuiz);
        document.getElementById("sendButton").addEventListener("click", sendToFriend);
    }

    function sendToFriend() {
        const answersEncoded = btoa(JSON.stringify(userAnswers));
        const link = `${window.location.origin}${window.location.pathname}?answers=${answersEncoded}`;

        vkBridge.send("VKWebAppShare", {
            link: link,
            title: "Сравним наши ответы!",
            description: "Я прошёл опрос, попробуй и ты!"
        }).catch(error => {
            console.error("Ошибка отправки:", error);
            alert("Не удалось отправить приглашение");
        });
    }

    function showComparisonScreen(friendAnswers) {
        quizScreen.innerHTML = `
            <div class="comparison-screen">
                <h2>Сравнение ответов</h2>
                <div id="comparisonResults"></div>
                <button id="restartButton" class="nav-button">Пройти ещё раз</button>
            </div>
        `;

        const resultsContainer = document.getElementById("comparisonResults");
        let matchCount = 0;

        quizData.forEach((question, index) => {
            const userAnswer = formatAnswer(question, userAnswers[index]);
            const friendAnswer = formatAnswer(question, friendAnswers[index]);
            const isMatch = userAnswer === friendAnswer;

            if (isMatch) matchCount++;

            resultsContainer.innerHTML += `
                <div class="question-result">
                    <h3>${question.question}</h3>
                    <p><strong>Ваш ответ:</strong> ${userAnswer}</p>
                    <p><strong>Ответ друга:</strong> ${friendAnswer}</p>
                    <div class="match ${isMatch ? 'match-yes' : 'match-no'}">
                        ${isMatch ? '✔ Совпадение' : '✖ Различие'}
                    </div>
                </div>
            `;
        });

        // Добавляем процент совпадений
        const matchPercent = Math.round((matchCount / quizData.length) * 100);
        resultsContainer.innerHTML = `
            <div class="match-summary">
                Ваша совместимость: <strong>${matchPercent}%</strong>
                (${matchCount} из ${quizData.length})
            </div>
            ${resultsContainer.innerHTML}
        `;

        document.getElementById("restartButton").addEventListener("click", restartQuiz);
    }

    function formatAnswer(question, answer) {
        if (question.type === "multiple") {
            return answer && answer.length
                ? answer.map(idx => question.options[idx]).join(", ")
                : "Нет ответа";
        }
        return answer !== null ? question.options[answer] : "Нет ответа";
    }

    function restartQuiz() {
        currentQuestionIndex = 0;
        userAnswers = quizData.map(q => q.type === "multiple" ? [] : null);

        quizScreen.innerHTML = `
            <div id="progressCounter"></div>
            <h2 id="questionText"></h2>
            <div id="optionsContainer"></div>
            <div class="navigation">
                <button id="prevButton" class="nav-button">← Назад</button>
                <button id="nextButton" class="nav-button">Вперёд →</button>
            </div>
        `;

        questionText = document.getElementById("questionText");
        optionsContainer = document.getElementById("optionsContainer");
        progressCounter = document.getElementById("progressCounter");
        prevButton = document.getElementById("prevButton");
        nextButton = document.getElementById("nextButton");

        prevButton.addEventListener("click", goToPreviousQuestion);
        nextButton.addEventListener("click", goToNextQuestion);

        showQuestion(currentQuestionIndex);
    }
});