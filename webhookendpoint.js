const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Middleware to parse JSON request body
app.use(bodyParser.json());

// Route for handling incoming POST requests
app.post('/webhook', (req, res) => {
    
    try {        
        // Log the request body to console
        console.log('Received array:', req.body);
        // Send response
        res.status(200).send('Array received successfully!');
} catch (error) {
    console.error(error);
    res.status(500).send(error)
}

});

// Start the server
const PORT = 5775; // Change this to the desired port number
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});