import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase.js"; // Adjust path if needed

let currentUserEmail = null; // Should be set from auth logic

// === TEXT-TO-SPEECH ===
function speak(text) {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  synth.speak(utter);
}

// === MAIN QUIZ FUNCTION ===
export function startQuiz(container, quizData, testName) {
  let currentQuestion = 0;
  let correctCount = 0;
  let missedQuestions = [];
  const categoryScores = {};
  let timeLeft = 30; // Seconds per question
  let timer;

  container.innerHTML = `
    <div class="card">
      <h2>${testName} Quiz</h2>
      <div id="timer" style="font-weight:bold; color:red;"></div>
      <div id="question-area"></div>
      <button id="next-btn">Next</button>
    </div>
  `;

  const questionArea = document.getElementById("question-area");
  const nextBtn = document.getElementById("next-btn");
  const timerDisplay = document.getElementById("timer");

  function startTimer() {
    timeLeft = 30;
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
    questionArea.innerHTML = `
      <p><strong>Q${currentQuestion + 1}:</strong> ${q.question}</p>
      ${q.choices.map((choice, idx) => `
        <label style="display:block;">
          <input type="radio" name="answer" value="${idx}">
          ${choice}
        </label>
      `).join("")}
    `;
    speak(q.question); // Text-to-speech
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
      }
    } else {
      missedQuestions.push(q);
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
        startQuiz(container, missedQuestions, `${testName} (Retry)`);
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