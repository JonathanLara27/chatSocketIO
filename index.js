// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server listening on http://localhost:%d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

let numUsers = 0;

io.on('connection', (socket) => {
  let addedUser = false;

  // cuando el cliente emite 'nuevo mensaje', este escucha y ejecuta
  socket.on('new message', (data) => {
    // le decimos al cliente que ejecute 'mensaje nuevo'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // cuando el cliente emite 'agregar usuario', este escucha y ejecuta
  socket.on('add user', (username) => {
    if (addedUser) return;

    // almacenamos el nombre de usuario en la sesión de socket para este cliente
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // emitimos globalmente (todos los clientes) que una persona se ha conectado
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // cuando el cliente emite 'escribiendo', lo transmitimos a otros
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // cuando el cliente emite 'dejar de escribir', lo transmitimos a otros
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // cuando el usuario se desconecta... realiza esto
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // emitimos globalmente que este cliente se ha ido
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});