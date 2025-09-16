function validationError(message)
{
    Swal.fire({
        icon: "error",
        text: message
      });
}

function errorNotification(message)
{
  Swal.fire({
    icon: "error",
    text: message
  });
}

function successNotification(message)
{
  Swal.fire({
    position: "center",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 1500
  });
}

function notificationMessage(message)
{
  Swal.fire({
    position: "top-end",
    text: message,
    showConfirmButton: false,
    timer: 2500
  });
}

function successMessage(message){
  Swal.fire({
    position: "center",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 1500
  });
}