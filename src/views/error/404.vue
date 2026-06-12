
<template>
  <div class="not-found-page">
    <div class="content">
      <h1 class="error-code">404</h1>
      <p class="error-msg">抱歉，您访问的页面不存在</p>
      <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.content { text-align: center; }
.error-code { font-size: 120px; font-weight: 700; color: #1890ff; margin: 0; line-height: 1; }
.error-msg { font-size: 18px; color: #8c8c8c; margin: 24px 0 36px; }
</style>
