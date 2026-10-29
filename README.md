Quiz Master
An interactive web application for creating and taking customizable quizzes. Try it out at https://quizmaster.js.org/

Features
Two Quiz Types

Q&A (Question & Answer) format, with optional text-to-speech
Multiple Choice Questions (MCQ) format, with scoring
File Support

Upload custom quizzes via Excel files (.xlsx)
Download sample templates for both quiz types
Automatic validation of file formats
Quiz Features

Randomized question order
Progress tracking (total / remaining questions)
Score calculation for MCQ (correct / wrong)
Navigation between questions (Previous / Next)
Instant feedback
Full-screen mode for distraction-free Q&A sessions
Start over functionality
Text-to-Speech (Q&A quiz)

On-device neural voices powered by Piper TTS, run fully client-side via WebAssembly (ONNX Runtime Web) — no server calls, no API keys
Toggle voice on/off per session
Choose from 17 English voices (US and UK accents) across low/medium/high quality tiers
Adjustable speech rate and volume
Repeat question / read answer aloud on demand
Voice models are downloaded on first use and cached in the browser (Origin Private File System) for offline reuse afterward
Live model status card showing download progress and the selected voice's quality grade
Reset voice settings back to defaults
Data Management

Local storage using IndexedDB
Reset all data option
Persistent storage between sessions
How to Use
Creating Quiz Files
Q&A Quiz Format
Create an Excel file with two columns:
question: The question text
answer: The correct answer
Multiple Choice Quiz Format
Create an Excel file with six columns:
question: The question text
option1: First choice
option2: Second choice
option3: Third choice
option4: Fourth choice
correct: The correct answer (must match one of the options)
Taking a Quiz
Visit https://quizmaster.js.org/
Choose your quiz type (Q&A or MCQ)
Upload your Excel file
Start answering questions!
Controls
Q&A Quiz

Click "Show Answer" to reveal the correct answer
Use Previous/Next buttons to navigate
Click "⛶ Full Screen" to expand the current question/answer to fill the whole screen
"Start Over" to reset and shuffle questions
Multiple Choice Quiz

Select your answer from the options
Get immediate feedback
Track your score as you progress
"Start Over" to reset and shuffle questions
Using Text-to-Speech (Q&A Quiz)
On the Q&A screen, toggle "🔊 Read questions aloud (Piper TTS)" on
Open "Settings" to choose a voice, and adjust the rate/volume sliders
The first time you use a given voice, its model is downloaded automatically (sizes range from ~20 MB to ~115 MB depending on quality) and then cached for future sessions
Use "🔊 Repeat Question" to replay the question, or "🔊 Read Answer" (shown after revealing the answer) to hear it read aloud
Use "↺ Reset" to restore default voice, rate, and volume settings
Text-to-speech requires a browser with WebAssembly and Origin Private File System support (recent Chrome, Edge, or Firefox).

Sample Files
Download sample templates directly from the application:

Click "Download Sample Q&A" for Q&A format
Click "Download Sample MCQ" for Multiple Choice format
Technical Details
Built With
HTML5
CSS3
JavaScript (ES6+)
IndexedDB for local storage
SheetJS for Excel file handling
Piper TTS (via @diffusionstudio/vits-web) and ONNX Runtime Web for on-device neural text-to-speech
Project Files
index.html — page structure and markup for the home, Q&A, and MCQ screens
styles.css — application styling, including the voice panel and full-screen layout
script.js — quiz logic, IndexedDB storage, Excel import/export, and UI/voice-control wiring
piper-tts.js — ES module wrapping the Piper TTS engine (voice catalog, download/caching, and speech synthesis), exposed to script.js via window.piperTTS
Browser Support
Chrome (recommended)
Firefox
Safari
Edge
Note: the text-to-speech feature additionally requires WebAssembly and Origin Private File System support; without it, the voice toggle is unavailable but the rest of the app works normally.

Tips
Ensure your Excel files follow the exact column structure
All fields must be filled for questions to be valid
For MCQ, the correct answer must match one of the options exactly
Use "Reset All" to clear all stored questions and start fresh
Higher-quality voices sound more natural but have larger downloads — pick a lower-quality voice if you're on a slow connection
Limitations
Excel files (.xlsx) only
Maximum file size depends on browser limitations
Data is stored locally in the browser
Requires JavaScript to be enabled
Text-to-speech voice models are downloaded on demand and require enough free browser storage to cache
For any issues or feature requests, please update in github issues
