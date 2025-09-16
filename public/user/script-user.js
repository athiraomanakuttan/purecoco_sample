
document.addEventListener('DOMContentLoaded', (event) => {
    const userDropdown = document.getElementById('userDropdown');
    const dropdownMenu = userDropdown.nextElementSibling;

    userDropdown.addEventListener('click', (e) => {
        e.preventDefault();
        dropdownMenu.style.display = (dropdownMenu.style.display === 'block') ? 'none' : 'block';
    });

    // Optionally, you can close the dropdown when clicking outside of it
    document.addEventListener('click', (e) => {
        if (!userDropdown.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });
});

function displayBtn(){
    document.getElementById('update-btn').style.display='block'
}