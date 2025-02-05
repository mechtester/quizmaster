# Quiz Master

An interactive web application for creating and taking customizable quizzes. Try it out at [https://quizmaster.js.org/](https://quizmaster.js.org/)

## Features

- **Two Quiz Types**
  - Q&A (Question & Answer) format
  - Multiple Choice Questions (MCQ) format

- **File Support**
  - Upload custom quizzes via Excel files (.xlsx)
  - Download sample templates for both quiz types
  - Automatic validation of file formats

- **Quiz Features**
  - Randomized question order
  - Progress tracking
  - Score calculation for MCQ
  - Navigation between questions
  - Instant feedback
  - Start over functionality

- **Data Management**
  - Local storage using IndexedDB
  - Reset all data option
  - Persistent storage between sessions

## How to Use

### Creating Quiz Files

#### Q&A Quiz Format
1. Create an Excel file with two columns:
   - `question`: The question text
   - `answer`: The correct answer

#### Multiple Choice Quiz Format
1. Create an Excel file with six columns:
   - `question`: The question text
   - `option1`: First choice
   - `option2`: Second choice
   - `option3`: Third choice
   - `option4`: Fourth choice
   - `correct`: The correct answer (must match one of the options)

### Taking a Quiz

1. Visit [https://quizmaster.js.org/](https://quizmaster.js.org/)
2. Choose your quiz type (Q&A or MCQ)
3. Upload your Excel file
4. Start answering questions!

### Controls

- **Q&A Quiz**
  - Click "Show Answer" to reveal the correct answer
  - Use Previous/Next buttons to navigate
  - "Start Over" to reset and shuffle questions

- **Multiple Choice Quiz**
  - Select your answer from the options
  - Get immediate feedback
  - Track your score as you progress
  - "Start Over" to reset and shuffle questions

### Sample Files
Download sample templates directly from the application:
- Click "Download Sample Q&A" for Q&A format
- Click "Download Sample MCQ" for Multiple Choice format

## Technical Details

### Built With
- HTML5
- CSS3
- JavaScript (ES6+)
- IndexedDB for local storage
- SheetJS for Excel file handling

### Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Tips
1. Ensure your Excel files follow the exact column structure
2. All fields must be filled for questions to be valid
3. For MCQ, the correct answer must match one of the options exactly
4. Use "Reset All" to clear all stored questions and start fresh

## Limitations
- Excel files (.xlsx) only
- Maximum file size depends on browser limitations
- Data is stored locally in the browser
- Requires JavaScript to be enabled

For any issues or feature requests, please update in github issues 

Credits ::: Claude AI model , Chat GPT , 
Special thanks to js.org subdomain sponsor   https://js.org/
