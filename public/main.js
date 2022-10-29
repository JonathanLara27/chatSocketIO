$(function() {
    const FADE_TIME = 150; // ms
    const TYPING_TIMER_LENGTH = 400; // ms
    const COLORS = [
      '#e21400', '#91580f', '#f8a700', '#f78b00',
      '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
      '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ]; //colores para el nombre de usuario
  
    // Inicializar variables
    const $window = $(window);
    const $usernameInput = $('.usernameInput'); // Input for username
    const $messages = $('.messages');           // Messages area
    const $inputMessage = $('.inputMessage');   // Input message input box
  
    const $loginPage = $('.login.page');        // The login page
    const $chatPage = $('.chat.page');          // The chatroom page

    //para elegir entre tema oscuro o claro
    var nombreTema= $('.nombretema');
    var style= $('#tema');
    var elegirtema= $('#switch');

    elegirtema.click(function(){
      if(elegirtema.is(':checked')){
        style.attr('href', 'dark.css');
        //añadir tema a nombre tema
        nombreTema.html('Dark');
        console.log(nombreTema);
      }else{
        style.attr('href', 'light.css');
        nombreTema.html('Light');
        console.log(nombreTema);
      }
    })


  
    const socket = io();
  
    // Prompt for setting a username
    let username;
    let connected = false;
    let typing = false;
    let lastTypingTime;
    let $currentInput = $usernameInput.focus();
  
    const addParticipantsMessage = (data) => {
      let message = '';
      if (data.numUsers === 1) {
        message += `Hay 1 participante`;
      } else {
        message += `Hay ${data.numUsers} participantes`;
      }
      log(message);
    }
  
    // establece el nombre de usuario del cliente
    const setUsername = () => {
      username = cleanInput($usernameInput.val().trim());
  
      // Si el nombre de usuario es válido
      if (username) {
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();
  
        // enviamos al servidor el nombre de usuario
        socket.emit('add user', username);
      }
    }
  
    // envía un mensaje de chat
    const sendMessage = () => {
      let message = $inputMessage.val();
      // evitar que se inyecte marcado en el mensaje
      message = cleanInput(message);
      // si hay un mensaje no vacío y una conexión de socket
      if (message && connected) {
        $inputMessage.val('');
        addChatMessage({ username, message });
        // decirle al servidor que ejecute 'mensaje nuevo' y envíe un parámetro
        socket.emit('new message', message);
      }
    }
  
    // apuntamos el mensaje de chat
    const log = (message, options) => {
      const $el = $('<li>').addClass('log').text(message);
      addMessageElement($el, options);
    }
  
    // agrega el mensaje de chat visual a la lista de mensajes
    const addChatMessage = (data, options = {}) => {
      // no desvanezca el mensaje si hay una 'x estaba escribiendo'
      const $typingMessages = getTypingMessages(data);
      if ($typingMessages.length !== 0) {
        options.fade = false;
        $typingMessages.remove();
      }
  
      const $usernameDiv = $('<span class="username"/>')
        .text(data.username)
        .css('color', getUsernameColor(data.username));
      const $messageBodyDiv = $('<span class="messageBody">')
        .text(data.message);
  
      const typingClass = data.typing ? 'typing' : '';
      const $messageDiv = $('<li class="message"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);
  
      addMessageElement($messageDiv, options);
    }
  
    // agrega el mensaje de escritura de chat visual
    const addChatTyping = (data) => {
      data.typing = true;
      data.message = 'Está escribiendo...';
      addChatMessage(data);
    }
  
    // quita el mensaje de escritura de chat visual
    const removeChatTyping = (data) => {
      getTypingMessages(data).fadeOut(function () {
        $(this).remove();
      });
    }
  
    // Agrega un elemento de mensaje a los mensajes y se desplaza hacia abajo
    // (el) - El elemento a agregar como mensaje
    // options.fade - Si el elemento debe aparecer gradualmente (predeterminado = verdadero)
    // options.prepend - Si el elemento debe anteponerse
    // todos los demás mensajes (predeterminado = falso)
    const addMessageElement = (el, options) => {
      const $el = $(el);
      // Setup default options
      if (!options) {
        options = {};
      }
      if (typeof options.fade === 'undefined') {
        options.fade = true;
      }
      if (typeof options.prepend === 'undefined') {
        options.prepend = false;
      }
  
      // Apply options
      if (options.fade) {
        $el.hide().fadeIn(FADE_TIME);
      }
      if (options.prepend) {
        $messages.prepend($el);
      } else {
        $messages.append($el);
      }
  
      $messages[0].scrollTop = $messages[0].scrollHeight;
    }
  
    // Evita que la entrada tenga marcas inyectadas
    const cleanInput = (input) => {
      return $('<div/>').text(input).html();
    }
  
    // Updates the typing event
    const updateTyping = () => {
      if (connected) {
        if (!typing) {
          typing = true;
          socket.emit('typing');
        }
        lastTypingTime = (new Date()).getTime();
  
        setTimeout(() => {
          const typingTimer = (new Date()).getTime();
          const timeDiff = typingTimer - lastTypingTime;
          if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
            socket.emit('stop typing');
            typing = false;
          }
        }, TYPING_TIMER_LENGTH);
      }
    }
  
    // Obtiene los mensajes 'X está escribiendo' de un usuario
    const getTypingMessages = (data) => {
      return $('.typing.message').filter(function (i) {
        return $(this).data('username') === data.username;
      });
    }
  
    // Obtiene el color de un nombre de usuario a través de nuestra función hash
    const getUsernameColor = (username) => {
      // Compute hash code
      let hash = 7;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + (hash << 5) - hash;
      }
      // Calculate color
      const index = Math.abs(hash % COLORS.length);
      return COLORS[index];
    }
  
    // Keyboard events
  
    $window.keydown(event => {
      // Enfoca automáticamente la entrada actual cuando se escribe una tecla
      if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $currentInput.focus();
      }
      // Cuando el cliente presiona ENTER en su teclado
      if (event.which === 13) {
        if (username) {
          sendMessage();
          socket.emit('stop typing');
          typing = false;
        } else {
          setUsername();
        }
      }
    });
  
    $inputMessage.on('input', () => {
      updateTyping();
    });
  
    // Click events
  
    // Entrada de enfoque al hacer clic en cualquier lugar de la página de inicio de sesión
    $loginPage.click(() => {
      $currentInput.focus();
    });
  
    // Enfocar la entrada al hacer clic en el borde de la entrada del mensaje
    $inputMessage.click(() => {
      $inputMessage.focus();
    });
  
    // Socket events
  
    // Siempre que el servidor emita 'iniciar sesión', registre el mensaje de inicio de sesión
    socket.on('login', (data) => {
      connected = true;
      // Despliega el mensaje de bienvenida
      const message = 'Bienvenido al chat de PPC';
      log(message, {
        prepend: true
      });
      addParticipantsMessage(data);
    });
  
    // Siempre que el servidor emita un 'mensaje nuevo', actualice el cuerpo del chat
    socket.on('new message', (data) => {
      addChatMessage(data);
    });
  
    // Siempre que el servidor emita 'usuario unido', regístrelo en el cuerpo del chat
    socket.on('user joined', (data) => {
      log(`${data.username} se ha unido`);
      addParticipantsMessage(data);
    });
  
    // Siempre que el servidor emita 'usuario dejado', regístrelo en el cuerpo del chat
    socket.on('user left', (data) => {
      log(`${data.username} se fue`);
      addParticipantsMessage(data);
      removeChatTyping(data);
    });
  
    // Cada vez que el servidor emite 'escribiendo', muestra el mensaje de escritura
    socket.on('typing', (data) => {
      addChatTyping(data);
    });
  
    // Cada vez que el servidor emite 'dejar de escribir', elimine el mensaje de escritura
    socket.on('stop typing', (data) => {
      removeChatTyping(data);
    });
  
    socket.on('disconnect', () => {
      log('Has sido desconectado');
    });
  
    socket.io.on('reconnect', () => {
      log('Has sido reconectado!');
      if (username) {
        socket.emit('add user', username);
      }
    });
  
    socket.io.on('reconnect_error', () => {
      log('Intentando reconectar...');
    });
  
  });