document.getElementById('buttonInput').addEventListener('click', function() {
    var textInput = document.getElementById('textInput').value;
    document.getElementById('textInput').value = '';
    var chatbox = document.getElementById('chatbox');
    chatbox.innerHTML += `<p class="userText"><span>${textInput}</span></p>`;

    fetch('/sendMessage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: textInput })
    })
    .then(response => response.json())
    .then(data => {
        chatbox.innerHTML += `<p class="botText"><span>${data.answer}</span></p>`;
        chatbox.scrollTop = chatbox.scrollHeight;
    })
    .catch(error => console.error('Error:', error));
});
