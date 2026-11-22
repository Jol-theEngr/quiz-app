
/* DOM selections */
const startSection = document.querySelector("#start-section");
const quizSection = document.querySelector("#quiz-section");
const resultsSection = document.querySelector("#results-section");

const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const nextButton = document.querySelector("#next-button");
const tryAgainButton = document.querySelector("#try-again");

const loading = document.querySelector("#loading");
const errorMessage = document.querySelector("#error-message");

const category = document.querySelector("#category");
const difficulty = document.querySelector("#difficulty");

const questionNo = document.querySelector("#question-no");
const actualQuestion = document.querySelector("#actual-question");
const optionsContainer = document.querySelector("#options");
const scoreDisplay = document.querySelector("#score");
const timerDisplay = document.querySelector("#timer");

const bestScoreDisplay = document.querySelector("#best-score");
const finalScore = document.querySelector("#final-score");
const percentageDisplay = document.querySelector("#percentage");
const performanceMsg = document.querySelector("#performance-msg");


/* Game variables */
let quiz;
let timer;
let timeLeft = 15;
let hasAnswered = false;

const BEST_SCORE_KEY = "jolQuizBestScore";


/* Question class */
class Question {
    constructor(question, correctAnswer, incorrectAnswers) {
        this.question = question;
        this.correctAnswer = correctAnswer;

        this.options = this.shuffleAnswers([
            correctAnswer,
            ...incorrectAnswers
        ]);
    }

    shuffleAnswers(answers) {
        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [answers[i], answers[j]] = [answers[j], answers[i]];
        }

        return answers;
    }
}


/* Quiz class */
class Quiz {
    constructor(questions) {
        this.questions = questions;
        this.currentIndex = 0;
        this.score = 0;
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    checkAnswer(answer) {
        const currentQuestion = this.getCurrentQuestion();

        if (answer === currentQuestion.correctAnswer) {
            this.score++;
            return true;
        }

        return false;
    }

    nextQuestion() {
        this.currentIndex++;
    }

    isFinished() {
        return this.currentIndex >= this.questions.length;
    }
}


/* Fetch categories */
async function getCategories() {
    try {
        const response = await fetch(
            "https://opentdb.com/api_category.php"
        );

        if (!response.ok) {
            throw new Error("Failed to load categories");
        }

        const data = await response.json();

        data.trivia_categories.forEach(function (item) {
            const option = document.createElement("option");

            option.value = item.id;
            option.textContent = item.name;

            category.append(option);
        });

    } catch (error) {
        console.error("Error fetching categories:", error.message);
    }
}


/* Fetch questions */
async function getQuestions() {
    loading.hidden = false;
    errorMessage.hidden = true;
    tryAgainButton.hidden = true;

    try {
        let url = "https://opentdb.com/api.php?amount=10&encode=url3986";

        if (category.value) {
            url += `&category=${category.value}`;
        }

        if (difficulty.value) {
            url += `&difficulty=${difficulty.value}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load questions");
        }

        const data = await response.json();

        if (data.response_code !== 0) {
            throw new Error("Unable to load questions");
        }

        const questions = data.results.map(function (item) {
            const questionText = decodeURIComponent(item.question);
            const correctAnswer = decodeURIComponent(item.correct_answer);

            const incorrectAnswers = item.incorrect_answers.map(function (answer) {
                return decodeURIComponent(answer);
            });

            return new Question(
                questionText,
                correctAnswer,
                incorrectAnswers
            );
        });

        return questions;

    } catch (error) {
        console.error("Error fetching questions:", error.message);

        errorMessage.hidden = false;
        tryAgainButton.hidden = false;

        return null;

    } finally {
        loading.hidden = true;
    }
}


/* Start the quiz */
async function startQuiz() {
    startButton.disabled = true;
    tryAgainButton.disabled = true;

    startSection.hidden = true;
    resultsSection.hidden = true;
    quizSection.hidden = false;

    const questions = await getQuestions();

    startButton.disabled = false;
    tryAgainButton.disabled = false;

    if (questions === null) {
        return;
    }

    quiz = new Quiz(questions);

    renderQuestion();
}


/* Display current question */
function renderQuestion() {
    clearInterval(timer);

    const currentQuestion = quiz.getCurrentQuestion();

    hasAnswered = false;
    timeLeft = 15;

    questionNo.textContent =
        `Question ${quiz.currentIndex + 1} of ${quiz.questions.length}`;

    scoreDisplay.textContent = `Score: ${quiz.score}`;
    timerDisplay.textContent = `Time: ${timeLeft}s`;

    actualQuestion.textContent = currentQuestion.question;

    optionsContainer.innerHTML = "";
    nextButton.hidden = true;

    currentQuestion.options.forEach(function (answer) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = answer;
        button.classList.add("answer-button");

        button.addEventListener("click", function () {
            selectAnswer(answer);
        });

        optionsContainer.append(button);
    });

    startTimer();
}


/* Countdown timer */
function startTimer() {
    timer = setInterval(function () {
        timeLeft--;

        timerDisplay.textContent = `Time: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            selectAnswer(null);
        }

    }, 1000);
}


/* Handle answer selection */
function selectAnswer(selectedAnswer) {
    if (hasAnswered) {
        return;
    }

    hasAnswered = true;
    clearInterval(timer);

    const currentQuestion = quiz.getCurrentQuestion();

    let isCorrect = false;

    if (selectedAnswer !== null) {
        isCorrect = quiz.checkAnswer(selectedAnswer);
    }

    const answerButtons =
        optionsContainer.querySelectorAll(".answer-button");

    answerButtons.forEach(function (button) {
        button.disabled = true;

        if (button.textContent === currentQuestion.correctAnswer) {
            button.classList.add("correct");
        }

        if (
            button.textContent === selectedAnswer &&
            !isCorrect
        ) {
            button.classList.add("wrong");
        }
    });

    scoreDisplay.textContent = `Score: ${quiz.score}`;

    nextButton.hidden = false;
}


/* Move to the next question */
function handleNextQuestion() {
    clearInterval(timer);

    quiz.nextQuestion();

    if (quiz.isFinished()) {
        showResults();
    } else {
        renderQuestion();
    }
}


/* Display results */
function showResults() {
    clearInterval(timer);

    quizSection.hidden = true;
    resultsSection.hidden = false;

    const totalQuestions = quiz.questions.length;

    const percentage = Math.round(
        (quiz.score / totalQuestions) * 100
    );

    finalScore.textContent =
        `Final Score: ${quiz.score}/${totalQuestions}`;

    percentageDisplay.textContent =
        `Percentage: ${percentage}%`;

    if (percentage >= 80) {
        performanceMsg.textContent = "Great job!";
    } else if (percentage >= 50) {
        performanceMsg.textContent = "Good effort! Keep practising.";
    } else {
        performanceMsg.textContent = "Keep learning. You can do better!";
    }

    saveBestScore();
}


/* Best score using localStorage */
function getBestScore() {
    return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
}

function displayBestScore() {
    bestScoreDisplay.textContent =
        `Best Score: ${getBestScore()}/10`;
}

function saveBestScore() {
    const bestScore = getBestScore();

    if (quiz.score > bestScore) {
        localStorage.setItem(BEST_SCORE_KEY, quiz.score);
    }

    displayBestScore();
}


/* Restart the quiz */
function restartQuiz() {
    clearInterval(timer);

    quiz = null;
    timeLeft = 15;
    hasAnswered = false;

    optionsContainer.innerHTML = "";

    nextButton.hidden = true;
    errorMessage.hidden = true;
    tryAgainButton.hidden = true;

    resultsSection.hidden = true;
    quizSection.hidden = true;
    startSection.hidden = false;

    displayBestScore();
}


/* Event listeners */
getCategories();
displayBestScore();

startButton.addEventListener("click", startQuiz);
tryAgainButton.addEventListener("click", startQuiz);
nextButton.addEventListener("click", handleNextQuestion);
restartButton.addEventListener("click", restartQuiz);
