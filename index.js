const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');

const mongoURI = "mongodb+srv://backuser:ckn64wKv65tZGvRq@cluster0.8hkg36n.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Conectado ao MongoDB Atlas');
  })
  .catch((error) => {
    console.log('Erro ao conectar ao MongoDB Atlas:', error);
  });

const Mensagem = mongoose.model('Mensagem', {
  texto: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  canal: {
    type: String,
    required: true
  },
  mensagem: {
    type: Object,
    required: true
  }
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const users = {};

io.on('connection', (socket) => {
  let username = '';

  socket.on('login', (name) => {
    username = name;
    users[socket.id] = username;
    io.emit('user-connected', username);
  });

  socket.on('mensagem', (msg) => {
    const mensagem = new Mensagem({ texto: msg, username: username, canal: socket.rooms[1], mensagem: {} });
    mensagem.save()
      .then(() => {
        io.emit('mensagem-recebida', { usuario: username, mensagem: msg });
      })
      .catch((error) => {
        console.log('Erro ao salvar mensagem no MongoDB Atlas:', error);
      });
  });

  socket.on('mudar-canal', async (canal) => {
    socket.leaveAll();
    socket.join(canal);
    io.to(canal).emit('canal-mudado', canal);
    try {
      const messages = await Mensagem.find({ canal: canal });
      messages.forEach((message) => {
        socket.emit('mensagem', { username: message.username, mensagem: message.texto });
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    if (username) {
      delete users[socket.id];
      io.emit('user-disconnected', username);
    }
  });
});

http.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
    
