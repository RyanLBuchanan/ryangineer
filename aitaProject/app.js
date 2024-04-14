const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = 3000;

// Serve static files from the public directory
app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/sendMessage', async (req, res) => {
    const { message } = req.body;
    const fetch = (await import('node-fetch')).default;

    const messages = [{
        role: "system",
        content: "You are a helpful assistant."
    }, {
        role: "user",
        content: message
    }];

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4-turbo-2024-04-09",
                messages: messages,
                max_tokens: 150
            })
        });
        const data = await response.json();
        console.log('API Response:', data);  // Log the entire response
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            res.json({ answer: data.choices[0].message.content });
        } else {
            // Handle no choices or error
            res.status(500).json({ error: "No response from API or missing message content", details: data });
        }
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        res.status(500).json({ error: "Failed to call API", details: error.message });
    }
});



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
