import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('bi_token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('bi_user') || '{}'))

  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.username || '')
  const avatar = computed(() => userInfo.value?.avatar || '')
  const roles = computed(() => userInfo.value?.roles || [])

  async function login(loginForm) {
    // const data = await authApi.login(loginForm)
    // token.value = data.token
    // userInfo.value = data.userInfo
    // localStorage.setItem('bi_token', data.token)
    // localStorage.setItem('bi_user', JSON.stringify(data.userInfo))
    // return data
      return null;
  }

  async function fetchUserInfo() {
    const data = await authApi.getUserInfo()
    userInfo.value = data
    localStorage.setItem('bi_user', JSON.stringify(data))
    return data
  }

  function logout() {
    token.value = ''
    userInfo.value = {}
    localStorage.removeItem('bi_token')
    localStorage.removeItem('bi_user')
  }

  return { token, userInfo, isLoggedIn, username, avatar, roles, login, fetchUserInfo, logout }
})
