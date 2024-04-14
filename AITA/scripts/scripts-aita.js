require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;


document.getElementById('buttonInput').addEventListener('click', function() {
    var textInput = document.getElementById('textInput').value;
    document.getElementById('textInput').value = '';
    var chatbox = document.getElementById('chatbox');
    chatbox.innerHTML += `<p class="userText"><span>${textInput}</span></p>`;

    fetch('https://api.openai.com/v1/engines/davinci-codex/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_OPENAI_API_KEY'
        },
        body: JSON.stringify({
            prompt: textInput,
            max_tokens: 150
        })
    })
    .then(response => response.json())
    .then(data => {
        chatbox.innerHTML += `<p class="botText"><span>${data.choices[0].text}</span></p>`;
        chatbox.scrollTop = chatbox.scrollHeight;
    })
    .catch(error => console.error('Error:', error));
});
