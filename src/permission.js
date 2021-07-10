import router from './router'
import store from './store'
import { Message } from 'element-ui'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import getPageTitle from '@/utils/get-page-title'
import { getEmail } from '@/utils/auth'

NProgress.configure({ showSpinner: false })

const whiteList = ['/', '/dashboard', '/search', '/login', '/register'] // no redirect whitelist

router.beforeEach(async(to, from, next) => {
  NProgress.start()
  document.title = getPageTitle(to.meta.title)

  const currentEmail = getEmail()

  if (currentEmail) {
    if (to.path === '/login') {
      next({ path: '/' })
      NProgress.done()
    } else {
      const hasRoles = store.getters.roles && store.getters.roles.length > 0
      if (hasRoles) {
        next()
      } else {
        try {
          const { roleList, rightList } = await store.dispatch('user/getInfo')
          const roles = roleList.map(item => item.rolename)
          const rights = rightList.map(item => item.rightname)

          // console.log('rolesDetails',roleList)
          // console.log('roles',roles)

          // generate accessible routes map based on roles
          const accessRoutes = await store.dispatch('permission/generateRoutes', {
            roles, rights
          })

          // dynamically add accessible routes
          router.addRoutes(accessRoutes)

          // hack method to ensure that addRoutes is complete
          // set the replace: true, so the navigation will not leave a history record
          next({ ...to, replace: true })
        } catch (error) {
          // remove token and go to login page to re-login
          await store.dispatch('user/resetToken')
          Message.error(error || 'Has Error')
          next(`/login?redirect=${to.path}`)
          NProgress.done()
        }
      }
    }
  } else {
    // TODO: get default roles and rights from remote server

    // const { roleList, rightList } = await store.dispatch('user/getInfo')
    const roles = ['tourist']
    const rights = ['']
    // console.log('rolesDetails',roleList)
    // console.log('roles',roles)
    const accessRoutes = await store.dispatch('permission/generateRoutes', {
      roles, rights
    })
    router.addRoutes(accessRoutes)

    if (whiteList.indexOf(to.path) !== -1) {
      next()
    } else {
      Message.error('请登录')
      next(`/login?redirect=${to.path}`)
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  // finish progress bar
  NProgress.done()
})
