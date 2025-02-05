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
    loadExistingQuestions();
};

request.onerror = function(event) {
    console.error('Database error: ' + event.target.errorCode);
};

function loadExistingQuestions() {
    retrieveQAQuestions();
    retrieveMCQQuestions();
}

// Sample data generation for downloads
function generateSampleQAData() {
    const data = [
    { "question": "What does HTTPS stand for?", "answer": "HyperText Transfer Protocol Secure" },
    { "question": "Which encryption protocol is commonly used in HTTPS?", "answer": "TLS (Transport Layer Security)" },
    { "question": "What is the purpose of a Content Security Policy (CSP) in web security?", "answer": "To prevent cross-site scripting (XSS) and data injection attacks by restricting resource loading." },
    { "question": "What is the principle of 'least privilege' in cloud security?", "answer": "Users and services should only have the minimum level of access required to perform their tasks." },
    { "question": "What does IAM stand for in cloud computing?", "answer": "Identity and Access Management" },
    { "question": "What is the difference between symmetric and asymmetric encryption?", "answer": "Symmetric encryption uses a single key for encryption and decryption, while asymmetric encryption uses a public-private key pair." },
    { "question": "What is a Zero Trust security model?", "answer": "A security framework that assumes no entity inside or outside the network is trusted by default." },
    { "question": "What is the Same-Origin Policy (SOP) in web security?", "answer": "A browser security feature that prevents scripts from accessing data from a different domain." },
    { "question": "What is a Man-in-the-Middle (MitM) attack?", "answer": "An attack where an attacker intercepts and potentially alters communication between two parties." },
    { "question": "What is the role of a Web Application Firewall (WAF)?", "answer": "To protect web applications by filtering and monitoring HTTP traffic for malicious activity." }
    ];
    return data;
}

function generateSampleMCQData() {
    const data = [
{
        "question": "Which protocol is used to secure websites with encryption?",
        "option1": "HTTP",
        "option2": "FTP",
        "option3": "HTTPS",
        "option4": "SMTP",
        "correct": "HTTPS"
    },
    {
        "question": "What does TLS stand for in web security?",
        "option1": "Transport Layer Security",
        "option2": "Total Lock System",
        "option3": "Transfer Load Security",
        "option4": "Trusted Link Service",
        "correct": "Transport Layer Security"
    },
    {
        "question": "Which cloud computing model provides virtual machines and networking resources?",
        "option1": "SaaS",
        "option2": "PaaS",
        "option3": "IaaS",
        "option4": "DaaS",
        "correct": "IaaS"
    },
    {
        "question": "Which HTTP header is used to prevent cross-site scripting (XSS)?",
        "option1": "X-Frame-Options",
        "option2": "Content-Security-Policy",
        "option3": "Referrer-Policy",
        "option4": "Strict-Transport-Security",
        "correct": "Content-Security-Policy"
    },
    {
        "question": "What is the purpose of multi-factor authentication (MFA)?",
        "option1": "To add an extra layer of security",
        "option2": "To replace strong passwords",
        "option3": "To encrypt network traffic",
        "option4": "To prevent malware attacks",
        "correct": "To add an extra layer of security"
    }
    ];
    return data;
}

// Download sample files
function downloadSampleQA() {
    const data = generateSampleQAData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Q&A Questions");
    XLSX.writeFile(wb, "sample_qa_questions.xlsx");
}

function downloadSampleMCQ() {
    const data = generateSampleMCQData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MCQ Questions");
    XLSX.writeFile(wb, "sample_mcq_questions.xlsx");
}

function handleQAFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get first sheet
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (jsonData.length === 0) {
                alert("No data found in the Excel file!");
                return;
            }

            const questions = jsonData.map(row => ({
                question: row.question?.trim(),
                answer: row.answer?.trim()
            })).filter(q => q.question && q.answer);

            if (questions.length === 0) {
                alert("No valid questions found. Please check the file format!");
                return;
            }
            
            // Store in IndexedDB
            const transaction = db.transaction(['qaQuestions'], 'readwrite');
            const store = transaction.objectStore('qaQuestions');
            questions.forEach(q => store.add(q));
            
            transaction.oncomplete = function() {
                retrieveQAQuestions();
            };
        } catch (error) {
            console.error('Error processing file:', error);
            alert("Error processing the Excel file. Please check the format.");
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Modified handleMCQFile function
function handleMCQFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get first sheet
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (jsonData.length === 0) {
                alert("No data found in the Excel file!");
                return;
            }

            // Validate the structure of each question
            const questions = [];
            for (let row of jsonData) {
                // Check if all required fields exist and are not empty
                if (!row.question || !row.option1 || !row.option2 || !row.option3 || 
                    !row.option4 || !row.correct) {
                    continue;
                }

                const question = {
                    question: row.question.trim(),
                    options: [
                        row.option1.trim(),
                        row.option2.trim(),
                        row.option3.trim(),
                        row.option4.trim()
                    ],
                    correct: row.correct.trim()
                };

                // Verify that the correct answer is one of the options
                if (question.options.includes(question.correct)) {
                    questions.push(question);
                }
            }

            if (questions.length === 0) {
                alert("No valid questions found. Please ensure your Excel file has the following columns:\nquestion, option1, option2, option3, option4, correct");
                return;
            }
            
            // Store in IndexedDB
            const transaction = db.transaction(['mcqQuestions'], 'readwrite');
            const store = transaction.objectStore('mcqQuestions');
            questions.forEach(q => store.add(q));
            
            transaction.oncomplete = function() {
                retrieveMCQQuestions();
            };
        } catch (error) {
            console.error('Error processing file:', error);
            alert("Error processing the Excel file. Please ensure your file follows the required format:\n- First row should contain headers\n- Required columns: question, option1, option2, option3, option4, correct");
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function showSection(sectionId) {
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('qaSection').classList.add('hidden');
    document.getElementById('mcqSection').classList.add('hidden');
    document.getElementById(sectionId).classList.remove('hidden');
}

function retrieveQAQuestions() {
    const transaction = db.transaction(['qaQuestions'], 'readonly');
    const store = transaction.objectStore('qaQuestions');
    const request = store.getAll();
    
    request.onsuccess = function(event) {
        qaQuestions = shuffleArray(event.target.result);
        if (qaQuestions.length > 0) {
            document.getElementById('qaTotalQuestions').textContent = qaQuestions.length;
            document.getElementById('qaRemainingQuestions').textContent = qaQuestions.length;
            document.getElementById('qaQuestions').classList.remove('hidden');
            showQAQuestion();
        }
    };
}

function retrieveMCQQuestions() {
    const transaction = db.transaction(['mcqQuestions'], 'readonly');
    const store = transaction.objectStore('mcqQuestions');
    const request = store.getAll();
    
    request.onsuccess = function(event) {
        mcqQuestions = shuffleArray(event.target.result);
        if (mcqQuestions.length > 0) {
            document.getElementById('mcqTotalQuestions').textContent = mcqQuestions.length;
            document.getElementById('mcqRemainingQuestions').textContent = mcqQuestions.length;
            document.getElementById('mcqQuestions').classList.remove('hidden');
            showMCQQuestion();
        }
    };
}

// Modified showQAQuestion function
function showQAQuestion() {
    const question = qaQuestions[currentQAIndex];
    document.getElementById('qaQuestion').textContent = question.question;
    document.getElementById('qaAnswer').classList.add('hidden');
    document.getElementById('qaAnswer').textContent = '';
    
    // Update remaining questions count - subtract current index from total length
    const remainingQuestions = qaQuestions.length - currentQAIndex - 1;
    document.getElementById('qaRemainingQuestions').textContent = Math.max(remainingQuestions, 0);
}

function showQAAnswer() {
    const answer = qaQuestions[currentQAIndex].answer;
    document.getElementById('qaAnswer').textContent = answer;
    document.getElementById('qaAnswer').classList.remove('hidden');
}

// ... (keep all the previous code up to showMCQQuestion) ...

// Modified showMCQQuestion function
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
    
    // Reset feedback and ensure it's hidden
    const feedback = document.getElementById('mcqFeedback');
    feedback.textContent = '';
    feedback.className = 'hidden';
    feedback.classList.add('hidden');
    
    // Update navigation buttons
    document.getElementById('prevMcqBtn').classList.toggle('hidden', currentMCQIndex === 0);
    document.getElementById('nextMcqBtn').classList.toggle('hidden', currentMCQIndex >= mcqQuestions.length - 1);
    
    // Update remaining questions count - subtract current index from total length
    const remainingQuestions = mcqQuestions.length - currentMCQIndex - 1;
    document.getElementById('mcqRemainingQuestions').textContent = Math.max(remainingQuestions, 0);
    
    // Add click handlers to radio buttons and ensure they're enabled
    document.querySelectorAll('input[name="mcq"]').forEach(radio => {
        radio.disabled = false;
        radio.checked = false;
        radio.onclick = checkMCQAnswer;
    });
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
    document.getElementById('mcqCorrect').textContent = mcqCorrect;
    document.getElementById('mcqWrong').textContent = mcqWrong;
    
    // Disable all radio buttons after answer is selected
    document.querySelectorAll('input[name="mcq"]').forEach(radio => {
        radio.disabled = true;
    });
}

// Modified nextQAQuestion function
function nextQAQuestion() {
    if (currentQAIndex < qaQuestions.length - 1) {
        currentQAIndex++;
        showQAQuestion();
    } else {
        document.getElementById('qaQuestions').innerHTML = `
            <div class="question-card">
                <h3>Quiz Complete!</h3>
                <p>You've completed all questions!</p>
                <button onclick="restartQAQuiz()" class="btn btn-primary">Start Over</button>
            </div>
        `;
        // Set remaining questions to 0 when quiz is complete
        document.getElementById('qaRemainingQuestions').textContent = '0';
    }
}

function previousQAQuestion() {
    if (currentQAIndex > 0) {
        currentQAIndex--;
        showQAQuestion();
    }
}

function nextMCQQuestion() {
    if (currentMCQIndex < mcqQuestions.length - 1) {
        currentMCQIndex++;
        showMCQQuestion();
    } else {
        const percentage = ((mcqCorrect / mcqQuestions.length) * 100).toFixed(1);
        document.getElementById('mcqQuestions').innerHTML = `
            <div class="question-card">
                <h3>Quiz Complete!</h3>
                <p>Correct Answers: ${mcqCorrect}</p>
                <p>Wrong Answers: ${mcqWrong}</p>
                <p>Score: ${percentage}%</p>
                <button onclick="restartMCQQuiz()" class="btn btn-primary">Start Over</button>
            </div>
        `;
        // Set remaining questions to 0 when quiz is complete
        document.getElementById('mcqRemainingQuestions').textContent = '0';
    }
}

function previousMCQQuestion() {
    if (currentMCQIndex > 0) {
        currentMCQIndex--;
        showMCQQuestion();
    }
}

// Modified restartQAQuiz function to properly reset the count
function restartQAQuiz() {
    currentQAIndex = 0;
    qaScore = 0;
    qaQuestions = shuffleArray(qaQuestions);

    // Reset the UI elements
    const questionsDiv = document.getElementById('qaQuestions');
    questionsDiv.innerHTML = `
        <div class="question-card">
            <p id="qaQuestion" class="question"></p>
            <div class="answer-section">
                <button onclick="showQAAnswer()" class="btn btn-secondary">Show Answer</button>
                <p id="qaAnswer" class="hidden answer"></p>
            </div>
            <div class="navigation-buttons">
                <button onclick="previousQAQuestion()" class="btn btn-outline">Previous</button>
                <button onclick="nextQAQuestion()" class="btn btn-outline">Next</button>
            </div>
        </div>
    `;

    // Update total questions count
    document.getElementById('qaTotalQuestions').textContent = qaQuestions.length;
    // Set initial remaining questions count (total - 1 for current question)
    document.getElementById('qaRemainingQuestions').textContent = qaQuestions.length - 1;
    questionsDiv.classList.remove('hidden');
    showQAQuestion();
}


// Modified restartMCQQuiz function to properly reset the count
function restartMCQQuiz() {
    currentMCQIndex = 0;
    mcqCorrect = 0;
    mcqWrong = 0;
    mcqQuestions = shuffleArray(mcqQuestions);
    
    // Reset the UI elements
    const questionsDiv = document.getElementById('mcqQuestions');
    questionsDiv.innerHTML = `
        <div class="question-card">
            <p id="mcqQuestion" class="question"></p>
            <div id="mcqOptions" class="options-grid"></div>
            <p id="mcqFeedback" class="hidden"></p>
            <div class="navigation-buttons">
                <button onclick="previousMCQQuestion()" class="btn btn-outline" id="prevMcqBtn">Previous</button>
                <button onclick="nextMCQQuestion()" class="btn btn-outline" id="nextMcqBtn">Next</button>
            </div>
        </div>
        <div class="score-summary">
            <span>Correct: <span id="mcqCorrect" class="correct">0</span></span>
            <span>Wrong: <span id="mcqWrong" class="incorrect">0</span></span>
        </div>
    `;
    
    // Update total questions count
    document.getElementById('mcqTotalQuestions').textContent = mcqQuestions.length;
    // Set initial remaining questions count (total - 1 for current question)
    document.getElementById('mcqRemainingQuestions').textContent = mcqQuestions.length - 1;
    questionsDiv.classList.remove('hidden');
    
    // Reset score display
    document.getElementById('mcqCorrect').textContent = '0';
    document.getElementById('mcqWrong').textContent = '0';
    
    showMCQQuestion();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Modified clearIndexedDB function
function clearIndexedDB() {
    const transaction = db.transaction(['qaQuestions', 'mcqQuestions'], 'readwrite');
    const qaStore = transaction.objectStore('qaQuestions');
    const mcqStore = transaction.objectStore('mcqQuestions');
    
    qaStore.clear();
    mcqStore.clear();
    
    transaction.oncomplete = function() {
        // Clear all data arrays
        qaQuestions = [];
        mcqQuestions = [];
        currentQAIndex = 0;
        currentMCQIndex = 0;
        qaScore = 0;
        mcqCorrect = 0;
        mcqWrong = 0;
        
        // Reset UI elements
        document.getElementById('qaTotalQuestions').textContent = '0';
        document.getElementById('qaRemainingQuestions').textContent = '0';
        document.getElementById('mcqTotalQuestions').textContent = '0';
        document.getElementById('mcqRemainingQuestions').textContent = '0';
        document.getElementById('mcqCorrect').textContent = '0';
        document.getElementById('mcqWrong').textContent = '0';
        
        // Reset question containers to their initial state
        document.getElementById('qaQuestions').innerHTML = `
            <div class="question-card">
                <p id="qaQuestion" class="question"></p>
                <div class="answer-section">
                    <button onclick="showQAAnswer()" class="btn btn-secondary">Show Answer</button>
                    <p id="qaAnswer" class="hidden answer"></p>
                </div>
                <div class="navigation-buttons">
                    <button onclick="previousQAQuestion()" class="btn btn-outline">Previous</button>
                    <button onclick="nextQAQuestion()" class="btn btn-outline">Next</button>
                </div>
            </div>
        `;
        
        document.getElementById('mcqQuestions').innerHTML = `
            <div class="question-card">
                <p id="mcqQuestion" class="question"></p>
                <div id="mcqOptions" class="options-grid"></div>
                <p id="mcqFeedback" class="hidden"></p>
                <div class="navigation-buttons">
                    <button onclick="previousMCQQuestion()" class="btn btn-outline" id="prevMcqBtn">Previous</button>
                    <button onclick="nextMCQQuestion()" class="btn btn-outline" id="nextMcqBtn">Next</button>
                </div>
            </div>
            <div class="score-summary">
                <span>Correct: <span id="mcqCorrect" class="correct">0</span></span>
                <span>Wrong: <span id="mcqWrong" class="incorrect">0</span></span>
            </div>
        `;
        
        // Hide question sections
        document.getElementById('qaQuestions').classList.add('hidden');
        document.getElementById('mcqQuestions').classList.add('hidden');
        
        // Clear file inputs
        document.getElementById('qaFile').value = '';
        document.getElementById('mcqFile').value = '';
        
        // Return to home screen
        showSection('homeScreen');
    };
}
// Initialize by showing home screen
document.addEventListener('DOMContentLoaded', function() {
    showSection('homeScreen');
});
