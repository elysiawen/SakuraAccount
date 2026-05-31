// 主要JavaScript文件

document.addEventListener('DOMContentLoaded', function() {
  // 激活当前导航项
  activateCurrentNavItem();
  
  // 初始化表单验证
  initFormValidation();
  
  // 初始化Bootstrap工具提示
  initTooltips();
  
  // 初始化警告消息自动关闭
  initAlertDismiss();
});

// 激活当前导航项
function activateCurrentNavItem() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.navbar .nav-link').forEach(link => {
    if (currentPath === link.getAttribute('href') || 
        (link.getAttribute('href') !== '/' && currentPath.startsWith(link.getAttribute('href')))) {
      link.classList.add('active');
    }
  });
}

// 初始化表单验证
function initFormValidation() {
  // 密码确认验证
  const passwordForm = document.querySelector('form:has(#password2), form:has(#confirmPassword)');
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      const password = document.getElementById('password') || document.getElementById('newPassword');
      const confirmPassword = document.getElementById('password2') || document.getElementById('confirmPassword');
      
      if (password && confirmPassword && password.value !== confirmPassword.value) {
        e.preventDefault();
        alert('两次输入的密码不一致');
      }
    });
  }
  
  // 文件上传验证
  const fileInput = document.getElementById('avatar');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (this.files[0] && this.files[0].size > maxSize) {
        alert('文件大小不能超过5MB');
        this.value = '';
      }
    });
  }
}

// 初始化Bootstrap工具提示
function initTooltips() {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

// 初始化警告消息自动关闭
function initAlertDismiss() {
  const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
  alerts.forEach(alert => {
    setTimeout(() => {
      const closeButton = alert.querySelector('.btn-close');
      if (closeButton) {
        closeButton.click();
      } else {
        alert.classList.remove('show');
        setTimeout(() => {
          alert.remove();
        }, 150);
      }
    }, 5000);
  });
}

// 图片预览功能
function previewImage(input, previewElement) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.querySelector(previewElement).src = e.target.result;
    }
    reader.readAsDataURL(input.files[0]);
  }
}