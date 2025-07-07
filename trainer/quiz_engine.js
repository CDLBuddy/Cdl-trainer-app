import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase.js"; // Adjust if needed

export let currentUserEmail = null; // This should be set from auth logic externally

// === TEXT-TO-SPEECH ===
function speak(text) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utter);
}

// === MAIN QUIZ FUNCTION ===
export function startQuiz(container, quizData, testName, options = {}) {
  const {
    revealAnswers = false,
    shuffleQuestions = true,
    secondsPerQuestion = 30
  } = options;

  let currentQuestion = 0;
  let correctCount = 0;
  let missedQuestions = [];
  const categoryScores = {};
  let timeLeft = secondsPerQuestion;
  let timer;

  if (shuffleQuestions) {
    quizData = quizData.sort(() => Math.random() - 0.5);
  }

  container.innerHTML = `
    <div class="card">
      <h2>${testName} Quiz</h2>
      <div id="progress-bar" style="height: 10px; background: #ddd; margin-bottom: 10px;">
        <div id="progress-fill" style="height: 10px; width: 0%; background: green;"></div>
      </div>
      <div id="timer" style="font-weight:bold; color:red;"></div>
      <div id="question-area"></div>
      <button id="next-btn">Next</button>
      <button id="exit-btn">❌ Exit</button>
    </div>
  `;

  const questionArea = document.getElementById("question-area");
  const nextBtn = document.getElementById("next-btn");
  const timerDisplay = document.getElementById("timer");
  const progressFill = document.getElementById("progress-fill");
  const exitBtn = document.getElementById("exit-btn");

  function startTimer() {
    timeLeft = secondsPerQuestion;
    timerDisplay.textContent = `⏳ Time: ${timeLeft}s`;
    clearInterval(timer);
    timer = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = `⏳ Time: ${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(timer);
        nextBtn.click(); // auto-advance
      }
    }, 1000);
  }

  function renderQuestion() {
    const q = quizData[currentQuestion];
    const progressPercent = Math.round((currentQuestion / quizData.length) * 100);
    progressFill.style.width = `${progressPercent}%`;

    questionArea.innerHTML = `
      <p><strong>Q${currentQuestion + 1}:</strong> ${q.question}</p>
      ${q.choices.map((choice, idx) => `
        <label style="display:block;">
          <input type="radio" name="answer" value="${idx}">
          ${choice}
        </label>
      `).join("")}
    `;
    speak(q.question);
    startTimer();
  }

  renderQuestion();

  nextBtn.addEventListener("click", async () => {
    clearInterval(timer);

    const selected = questionArea.querySelector("input[name='answer']:checked");
    const q = quizData[currentQuestion];
    const category = q.category || "General";

    if (!categoryScores[category]) categoryScores[category] = { correct: 0, total: 0 };
    categoryScores[category].total++;

    if (selected) {
      const answer = parseInt(selected.value);
      if (answer === q.answer) {
        correctCount++;
        categoryScores[category].correct++;
      } else {
        missedQuestions.push(q);
        if (revealAnswers) {
          alert(`❌ Incorrect. Correct answer: ${q.choices[q.answer]}`);
        }
      }
    } else {
      missedQuestions.push(q);
      if (revealAnswers) {
        alert(`❌ No answer selected. Correct answer: ${q.choices[q.answer]}`);
      }
    }

    currentQuestion++;

    if (currentQuestion >= quizData.length) {
      const score = Math.round((correctCount / quizData.length) * 100);
      await saveTestResult(testName, score, correctCount, quizData.length);
      showResults(score);
    } else {
      renderQuestion();
    }
  });

  exitBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to exit the quiz?")) {
      clearInterval(timer);
      renderPage("home");
    }
  });

  function showResults(score) {
    const summary = Object.entries(categoryScores).map(([cat, { correct, total }]) => {
      const pct = Math.round((correct / total) * 100);
      return `<li>${cat}: ${pct}% (${correct}/${total})</li>`;
    }).join("");

    container.innerHTML = `
      <div class="card">
        <h2>Quiz Complete ✅</h2>
        <p>Your score: <strong>${score}%</strong> (${correctCount}/${quizData.length})</p>
        <h3>📊 Category Breakdown</h3>
        <ul>${summary}</ul>
        ${missedQuestions.length > 0 ? `<button id="retry-btn">🔁 Retry Missed Questions</button>` : ""}
        <button data-nav="home">⬅️ Home</button>
      </div>
    `;
    setupNavigation();

    if (missedQuestions.length > 0) {
      document.getElementById("retry-btn").addEventListener("click", () => {
        startQuiz(container, missedQuestions, `${testName} (Retry)`, options);
      });
    }
  }
}

// === SAVE RESULTS TO FIRESTORE ===
async function saveTestResult(testName, score, correct, total) {
  if (!currentUserEmail) return alert("You must be logged in to save test results.");

  await addDoc(collection(db, "testResults"), {
    studentId: currentUserEmail,
    testName,
    score,
    correct,
    total,
    timestamp: new Date()
  });

  console.log("✅ Test result saved to Firestore.");
}