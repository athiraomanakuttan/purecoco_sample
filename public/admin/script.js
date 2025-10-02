// Delete Product Function
async function deleteProduct(productId, productName, event) {
  event.preventDefault();
  
  // Show confirmation dialog with product name
  if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/updateProductStatus/${productId}/-1`, {
      method: 'GET'
      // Remove headers and body for GET requests
    });

    if (response.ok) {
      const result = await response.json();
      
      // Remove the table row with fade effect
      const row = event.target.closest('tr');
      if (row) {
        row.style.opacity = '0';
        row.style.transition = 'opacity 0.3s';
        
        setTimeout(() => {
          row.remove();
          
          // Show success message
          if (typeof successNotification === 'function') {
            successNotification(result.message || 'Product deleted successfully');
          }
          
          // Reload page after a short delay to update counts
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }, 300);
      }
      
    } else {
      const error = await response.json();
      if (typeof validationError === 'function') {
        validationError(error.message || 'Failed to delete product');
      } else {
        alert(error.message || 'Failed to delete product');
      }
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    if (typeof validationError === 'function') {
      validationError('An error occurred while deleting the product');
    } else {
      alert('An error occurred while deleting the product');
    }
  }
}

// Toggle Product Status (Enable/Disable) Function
async function toggleProductStatus(productId, newStatus, productName, event) {
  event.preventDefault();
  
  const action = newStatus === 1 ? 'enable' : 'disable';
  if (!confirm(`Are you sure you want to ${action} "${productName}"?`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/updateProductStatus/${productId}/${newStatus}`, {
      method: 'GET'
      // Remove headers and body for GET requests
    });

    if (response.ok) {
      const result = await response.json();
      
      // Show success message
      if (typeof successNotification === 'function') {
        successNotification(result.message || `Product ${action}d successfully`);
      } else {
        alert(result.message || `Product ${action}d successfully`);
      }
      
      // Reload to update the UI
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } else {
      const error = await response.json();
      if (typeof validationError === 'function') {
        validationError(error.message || `Failed to ${action} product`);
      } else {
        alert(error.message || `Failed to ${action} product`);
      }
    }
  } catch (error) {
    console.error(`Error ${action}ing product:`, error);
    if (typeof validationError === 'function') {
      validationError(`An error occurred while ${action}ing the product`);
    } else {
      alert(`An error occurred while ${action}ing the product`);
    }
  }
}

// Toggle Dropdown Menu
function toggleDropdown(event, element) {
  event.preventDefault();
  event.stopPropagation();
  
  // Close all other dropdowns first
  document.querySelectorAll('#dropdownMenu').forEach(menu => {
    if (menu !== element.nextElementSibling) {
      menu.classList.add('hidden');
    }
  });
  
  // Toggle current dropdown
  const dropdown = element.nextElementSibling;
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  if (!event.target.closest('.relative')) {
    document.querySelectorAll('#dropdownMenu').forEach(menu => {
      menu.classList.add('hidden');
    });
  }
});

// Search Product Function
function searchProduct(value) {
  if (value.trim() === '') {
    window.location.href = '/admin/products';
  }
}

// Form Validation on Submit
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('addProductForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    const name = this.product_name.value.trim();
    const description = this.product_description.value.trim();
    const price = parseFloat(this.product_price.value);
    const quantity = this.product_quantity.value.trim();
    const stock = parseInt(this.product_stock.value);
    const category = this.product_category.value;
    const images = this.product_images.files;

    if (!name) {
      validationError("Product name is required.");
      e.preventDefault();
      return;
    }

    if (!description) {
      validationError("Product description is required.");
      e.preventDefault();
      return;
    }

    if (isNaN(price) || price <= 0) {
      validationError("Enter a valid product price.");
      e.preventDefault();
      return;
    }

    if (!/^\d+$/.test(quantity) || quantity <= 0) {
      validationError("Quantity must be a positive whole number.");
      e.preventDefault();
      return;
    }

    if (isNaN(stock) || stock < 0) {
      validationError("Stock must be a non-negative number.");
      e.preventDefault();
      return;
    }

    if (!category) {
      validationError("Please select a product category.");
      e.preventDefault();
      return;
    }

    if (images.length < 3) {
      validationError("Please upload at least 3 product images.");
      e.preventDefault();
      return;
    }
  });
});

// Close modal after successful submission
document.addEventListener('DOMContentLoaded', function () {
  const hasNotification = '<%= notification.status %>' !== '';
  
  if (hasNotification) {
    const modal = document.getElementById('exampleModal');
    if (modal) {
      const bootstrapModal = bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
    
    // Remove modal backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
    
    // Reset body styles
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
});