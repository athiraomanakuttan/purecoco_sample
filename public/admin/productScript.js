// ------------- croper code here -------------

let currentImageElement;
let cropper;

const cropperModalElement = document.getElementById("cropperModal");
const cropperModal = new bootstrap.Modal(cropperModalElement, {});
const imageToCrop = document.getElementById("image-to-crop");
const imageContainer = document.getElementById("imageContainer");
const productImagesInput = document.querySelector('input[name="product_images"]');
const formData = new FormData(); // Initialize FormData object

// Handle file input change
productImagesInput.addEventListener("change", function (event) {
  imageContainer.innerHTML = ""; // Clear any existing images
  const files = event.target.files;

  Array.from(files).forEach((file) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "100px";
      img.style.margin = "10px";
      img.classList.add("clickable-image");

      // Add click event listener to open cropper modal
      img.addEventListener("click", function () {
        currentImageElement = img;
        imageToCrop.src = e.target.result;
        cropperModal.show();

        cropperModalElement.addEventListener(
          "shown.bs.modal",
          () => {
            if (cropper) cropper.destroy();
            cropper = new Cropper(imageToCrop, {
              aspectRatio: 1,
              viewMode: 1,
              autoCropArea: 1,
              responsive: true,
              background: false,
            });
          },
          { once: true }
        );
      });

      imageContainer.appendChild(img);
    };

    reader.readAsDataURL(file);
  });
});

// Handle crop button click
document.getElementById("crop-button").addEventListener("click", function () {
  const canvas = cropper.getCroppedCanvas();

  // Convert canvas data to blob and append to FormData object
  canvas.toBlob(function (blob) {
    // Append the blob with a custom filename
    formData.append("product_images", blob, "cropped-image.jpeg");

    // Set the cropped image data to a hidden input field in the form
    const hiddenInput = document.createElement("input");
    hiddenInput.setAttribute("type", "hidden");
    hiddenInput.setAttribute("name", "cropped_images");
    hiddenInput.setAttribute("value", canvas.toDataURL());
    document.querySelector("form").appendChild(hiddenInput);

    // Update the image source with cropped image
    currentImageElement.src = canvas.toDataURL();

    cropperModal.hide();
    cropper.destroy();
  });
});


// Submit form with cropped images
document.querySelector("form").addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent form submission

  // Submit the form with FormData object including cropped images
  fetch(this.action, {
    method: this.method,
    body: formData,
  })
    .then((response) => {
      if(response.redirected)
        {
            window.location.href = response.url;
        }
      else if (response.ok) {
        return response.json();
      }
      throw new Error("Network response was not ok.");
    })
    .then((data) => {
      console.log("Success:", data);
      // Handle success, possibly redirect or update the UI
    })
    .catch((error) => {
      console.error("Error:", error);
      // Handle error
    });
});


// ------------ croper end here ------------------------------

var myModal = document.getElementById("myModal");
var myInput = document.getElementById("myInput");

myModal.addEventListener("shown.bs.modal", function () {
  myInput.focus();
});

function fileUpload() {
  const fileInput = document.querySelector('input[name="product_images"]');
  const files = fileInput.files;
  const imageContainer = document.getElementById("imageContainer");

  // Clear the previous images
  imageContainer.innerHTML = "";
  if (files.length > 4) {
    imageContainer.innerHTML = "You can only chosse maximum of 4 Images";
    imageContainer.style.color = "red";
    fileInput.value = "";
  } else {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = function (e) {
        const imageUrl = e.target.result;
        setImage(imageUrl, imageContainer);
      };

      reader.readAsDataURL(file);
    }
  }
}

// Function to set the image
function setImage(imageUrl, container) {
  const imgElement = document.createElement("img"); // Corrected to create an 'img' element
  imgElement.src = imageUrl;
  imgElement.className = "m-2"; // Add margin or other styling as needed
  imgElement.style.maxWidth = "200px"; // Limit the size of the displayed images
  container.appendChild(imgElement);
}
