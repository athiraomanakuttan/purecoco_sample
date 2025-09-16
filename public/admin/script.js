function toggleDropdown(event, element) {
    event.preventDefault(); // Prevent the default behavior of the anchor element

    var dropdownMenu = element.nextElementSibling; // Corrected
    var isVisible = window.getComputedStyle(dropdownMenu).display === 'block'; // Corrected

    // Hide all other dropdowns
    document.querySelectorAll('.dropdownMenu').forEach(function(drop) {
        drop.style.display = 'none';
    });

    // Toggle the clicked dropdown
    dropdownMenu.style.display = isVisible ? 'none' : 'block';
  }

    // Close dropdown if clicked outside
    window.onclick = function(event) {
        if (!event.target.matches('.bx-dots-vertical-rounded')) {
            var dropdowns = document.querySelectorAll('.dropdown');
            dropdowns.forEach(function(dropdown) {
                dropdown.style.display = 'none';
            });
        }
    }
    
    function dateFormat(inputDate) {
        const formated = new Date(inputDate);
      
        const options = { year: "numeric", month: "short", day: "numeric" };
        const formattedDate = formated.toLocaleDateString("en-US", options);
        return formattedDate;
      }
    