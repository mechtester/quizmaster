let qaQuestions = [];
let mcqQuestions = [];
let currentQAIndex = 0;
let currentMCQIndex = 0;
let qaScore = 0;
let mcqCorrect = 0;
let mcqWrong = 0;
let db;

// Initialize IndexedDB
const request = indexedDB.open('quizDB', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('qaQuestions')) {
        db.createObjectStore('qaQuestions', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains('mcqQuestions')) {
        db.createObjectStore('mcqQuestions', { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
};

request.onerror = function(event) {
    console.error('Database error: ' + event.target.errorCode);
};

function showSection(sectionId) {
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('qaSection').classList.add('hidden');
    document.getElementById('mcqSection').classList.add('hidden');
    document.getElementById(sectionId).classList.remove('hidden');
}

function handleQAFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').slice(1); // Skip header row
        const questions = rows.map(row => {
            const [question, answer] = row.split(',').map(cell => cell.trim());
            return { question, answer };
        }).filter(q => q.question && q.answer);
        
        // Store in IndexedDB
        const transaction = db.transaction(['qaQuestions'], 'readwrite');
        const store = transaction.objectStore('qaQuestions');
        questions.forEach(q => store.add(q));
        
        transaction.oncomplete = function() {
            retrieveQAQuestions();
        };
    };
    
    reader.readAsText(file);
}

function handleMCQFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').slice(1); // Skip header row
        const questions = rows.map(row => {
            const [question, opt1, opt2, opt3, opt4, correct] = row.split(',').map(cell => cell.trim());
            return {
                question,
                options: [opt1, opt2, opt3, opt4],
                correct
            };
        }).filter(q => q.question && q.options.length === 4 && q.correct);
        
        // Store in IndexedDB
        const transaction = db.transaction(['mcqQuestions'], 'readwrite');
        const store = transaction.objectStore('mcqQuestions');
        questions.forEach(q => store.add(q));
        
        transaction.oncomplete = function() {
            retrieveMCQQuestions();
        };
    };
    
    reader.readAsText(file);
}

function retrieveQAQuestions() {
    const transaction = db.transaction(['qaQuestions'], 'readonly');
    const store = transaction.objectStore('qaQuestions');
    const request = store.getAll();
    
    request.onsuccess = function(event) {
        qaQuestions = shuffleArray(event.target.result);
        if (qaQuestions.length > 0) {
            document.getElementById('qaQuestions').classList.remove('hidden');
            showQAQuestion();
        }
    };
    
    request.onerror = function(event) {
        console.error('Error retrieving QA questions: ' + event.target.errorCode);
    };
}

function retrieveMCQQuestions() {
    const transaction = db.transaction(['mcqQuestions'], 'readonly');
    const store = transaction.objectStore('mcqQuestions');
    const request = store.getAll();
    
    request.onsuccess = function(event) {
        mcqQuestions = shuffleArray(event.target.result);
        if (mcqQuestions.length > 0) {
            document.getElementById('mcqQuestions').classList.remove('hidden');
            showMCQQuestion();
        }
    };
    
    request.onerror = function(event) {
        console.error('Error retrieving MCQ questions: ' + event.target.errorCode);
    };
}

function showQAQuestion() {
    const question = qaQuestions[currentQAIndex];
    document.getElementById('qaQuestion').textContent = question.question;
    document.getElementById('qaAnswer').classList.add('hidden');
    document.getElementById('qaAnswer').textContent = '';
}

function showQAAnswer() {
    const answer = qaQuestions[currentQAIndex].answer;
    document.getElementById('qaAnswer').textContent = answer;
    document.getElementById('qaAnswer').classList.remove('hidden');
}

function showMCQQuestion() {
    const question = mcqQuestions[currentMCQIndex];
    document.getElementById('mcqQuestion').textContent = question.question;
    
    const optionsHtml = question.options.map((option, index) => `
        <div>
            <input type="radio" name="mcq" value="${option}" id="opt${index}">
            <label for="opt${index}">${option}</label>
        </div>
    `).join('');
    
    document.getElementById('mcqOptions').innerHTML = optionsHtml;
    document.getElementById('mcqFeedback').classList.add('hidden');
    document.getElementById('nextMcqBtn').classList.add('hidden');
    document.getElementById('prevMcqBtn').classList.add('hidden');
    
    // Add click handlers to radio buttons
    document.querySelectorAll('input[name="mcq"]').forEach(radio => {
        radio.onclick = checkMCQAnswer;
    });
    
    // Enable previous button if not on the first question
    if (currentMCQIndex > 0) {
        document.getElementById('prevMcqBtn').classList.remove('hidden');
    }
    
    // Enable next button if not on the last question
    if (currentMCQIndex < mcqQuestions.length - 1) {
        document.getElementById('nextMcqBtn').classList.remove('hidden');
    }
}

function checkMCQAnswer(e) {
    const selectedAnswer = e.target.value;
    const correctAnswer = mcqQuestions[currentMCQIndex].correct;
    const feedback = document.getElementById('mcqFeedback');
    
    if (selectedAnswer === correctAnswer) {
        feedback.textContent = "Correct!";
        feedback.className = "correct";
        mcqCorrect++;
    } else {
        feedback.textContent = `Incorrect. The correct answer is: ${correctAnswer}`;
        feedback.className = "incorrect";
        mcqWrong++;
    }
    
    feedback.classList.remove('hidden');
    document.getElementById('nextMcqBtn').classList.remove('hidden');
    document.getElementById('prevMcqBtn').classList.remove('hidden');
    document.getElementById('mcqCorrect').textContent = mcqCorrect;
    document.getElementById('mcqWrong').textContent = mcqWrong;
    
    // Disable all radio buttons after answer is selected
    document.querySelectorAll('input[name="mcq"]').forEach(radio => {
        radio.disabled = true;
    });
}

function nextQAQuestion() {
    currentQAIndex++;
    if (currentQAIndex < qaQuestions.length) {
        showQAQuestion();
    } else {
        document.getElementById('qaQuestions').innerHTML = `
            <h3>Quiz Complete!</h3>
            <p>Final Score: ${qaScore}/${qaQuestions.length}</p>
            <button onclick="location.reload()">Start Over</button>
        `;
    }
}

function previousQAQuestion() {
    currentQAIndex--;
    if (currentQAIndex >= 0) {
        showQAQuestion();
    } else {
        currentQAIndex = 0; // Ensure index doesn't go below 0
    }
}

function nextMCQQuestion() {
    currentMCQIndex++;
    if (currentMCQIndex < mcqQuestions.length) {
        showMCQQuestion();
    } else {
        document.getElementById('mcqQuestions').innerHTML = `
            <h3>Quiz Complete!</h3>
            <p>Correct Answers: ${mcqCorrect}</p>
            <p>Wrong Answers: ${mcqWrong}</p>
            <p>Score: ${((mcqCorrect / mcqQuestions.length) * 100).toFixed(1)}%</p>
            <button onclick="location.reload()">Start Over</button>
        `;
    }
}

function previousMCQQuestion() {
    currentMCQIndex--;
    if (currentMCQIndex >= 0) {
        showMCQQuestion();
    } else {
        currentMCQIndex = 0; // Ensure index doesn't go below 0
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function clearIndexedDB() {
    const transaction = db.transaction(['qaQuestions', 'mcqQuestions'], 'readwrite');
    const qaStore = transaction.objectStore('qaQuestions');
    const mcqStore = transaction.objectStore('mcqQuestions');
    
    qaStore.clear();
    mcqStore.clear();
    
    transaction.oncomplete = function() {
        qaQuestions = [];
        mcqQuestions = [];
        currentQAIndex = 0;
        currentMCQIndex = 0;
        qaScore = 0;
        mcqCorrect = 0;
        mcqWrong = 0;
        document.getElementById('qaQuestions').classList.add('hidden');
        document.getElementById('mcqQuestions').classList.add('hidden');
        showSection('homeScreen');
    };
    
    transaction.onerror = function(event) {
        console.error('Error clearing IndexedDB: ' + event.target.errorCode);
    };
}


function retrieveQAQuestions() {
    const transaction = db.transaction(['qaQuestions'], 'readonly');
    const store = transaction.objectStore('qaQuestions');
    const request = store.getAll();
    
    request.onsuccess = function(event) {
        qaQuestions = shuffleArray(event.target.result);
        if (qaQuestions.length > 0) {
            // Update total and remaining questions
            document.getElementById('qaTotalQuestions').textContent = qaQuestions.length;
            document.getElementById('qaRemainingQuestions').textContent = qaQuestions.length;
            
            document.getElementById('qaQuestions').classList.remove('hidden');
            showQAQuestion();
        }
    };
    
    request.onerror = function(event) {
        console.error('Error retrieving QA questions: ' + event.target.errorCode);
    };
}

function retrieveMCQQuestions() {
    const transaction = db.transaction(['mcqQuestions'], 'readonly');
    const store = transaction.objectStore('mcqQuestions');
    const request = store.getAll();
    
    request.onsuccess = function(event) {
        mcqQuestions = shuffleArray(event.target.result);
        if (mcqQuestions.length > 0) {
            // Update total and remaining questions
            document.getElementById('mcqTotalQuestions').textContent = mcqQuestions.length;
            document.getElementById('mcqRemainingQuestions').textContent = mcqQuestions.length;
            
            document.getElementById('mcqQuestions').classList.remove('hidden');
            showMCQQuestion();
        }
    };
    
    request.onerror = function(event) {
        console.error('Error retrieving MCQ questions: ' + event.target.errorCode);
    };
}


function nextQAQuestion() {
    currentQAIndex++;
    if (currentQAIndex < qaQuestions.length) {
        showQAQuestion();
        // Update remaining questions
        document.getElementById('qaRemainingQuestions').textContent = qaQuestions.length - currentQAIndex;
    } else {
        document.getElementById('qaQuestions').innerHTML = `
            <h3>Quiz Complete!</h3>
            <p>Final Score: ${qaScore}/${qaQuestions.length}</p>
            <button onclick="location.reload()">Start Over</button>
        `;
    }
}

function nextMCQQuestion() {
    currentMCQIndex++;
    if (currentMCQIndex < mcqQuestions.length) {
        showMCQQuestion();
        // Update remaining questions
        document.getElementById('mcqRemainingQuestions').textContent = mcqQuestions.length - currentMCQIndex;
    } else {
        document.getElementById('mcqQuestions').innerHTML = `
            <h3>Quiz Complete!</h3>
            <p>Correct Answers: ${mcqCorrect}</p>
            <p>Wrong Answers: ${mcqWrong}</p>
            <p>Score: ${((mcqCorrect / mcqQuestions.length) * 100).toFixed(1)}%</p>
            <button onclick="location.reload()">Start Over</button>
        `;
    }
}

function previousQAQuestion() {
    if (currentQAIndex > 0) {
        currentQAIndex--;
        showQAQuestion();
        // Update remaining questions
        document.getElementById('qaRemainingQuestions').textContent = qaQuestions.length - currentQAIndex;
    }
}

function previousMCQQuestion() {
    if (currentMCQIndex > 0) {
        currentMCQIndex--;
        showMCQQuestion();
        // Update remaining questions
        document.getElementById('mcqRemainingQuestions').textContent = mcqQuestions.length - currentMCQIndex;
    }
}
