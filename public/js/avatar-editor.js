// 头像编辑器JavaScript
document.addEventListener('DOMContentLoaded', function() {
  let cropper = null;
  const avatar = document.getElementById('avatar');
  const cropperImage = document.getElementById('cropperImage');
  const editorContainer = document.querySelector('.avatar-editor-container');
  const avatarForm = document.getElementById('avatarForm');
  const croppedImageInput = document.getElementById('croppedImage');

  // 文件选择处理
  avatar.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 检查文件大小
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('文件大小不能超过5MB');
      this.value = '';
      return;
    }

    // 创建文件预览
    const reader = new FileReader();
    reader.onload = function(e) {
      cropperImage.src = e.target.result;
      editorContainer.classList.add('active');
      
      // 销毁现有的裁剪器实例
      if (cropper) {
        cropper.destroy();
      }

      // 初始化裁剪器
      cropper = new Cropper(cropperImage, {
        aspectRatio: 1,
        viewMode: 1,
        preview: '.cropper-preview',
        autoCropArea: 1,
        responsive: true,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false
      });
    };
    reader.readAsDataURL(file);
  });

  // 旋转控制
  document.querySelector('.btn-rotate-left').addEventListener('click', function() {
    cropper && cropper.rotate(-90);
  });

  document.querySelector('.btn-rotate-right').addEventListener('click', function() {
    cropper && cropper.rotate(90);
  });

  // 缩放控制
  document.querySelector('.btn-zoom-in').addEventListener('click', function() {
    cropper && cropper.zoom(0.1);
  });

  document.querySelector('.btn-zoom-out').addEventListener('click', function() {
    cropper && cropper.zoom(-0.1);
  });

  // 表单提交处理
  avatarForm.addEventListener('submit', function(e) {
    if (!cropper) return;

    e.preventDefault();
    
    // 获取裁剪后的图片数据
    const canvas = cropper.getCroppedCanvas({
      width: 300,
      height: 300
    });

    // 转换为base64数据
    const croppedData = canvas.toDataURL('image/jpeg');
    croppedImageInput.value = croppedData;

    // 提交表单
    this.submit();
  });
});