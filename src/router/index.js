import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/user',
                    name: 'user',
                    component: () => import('@/views/User.vue')
                },
                {
                    path: '/',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue')
                },
                {
                    path: '/tokens',
                    name: 'tokens',
                    component: () => import('@/views/Tokens.vue')
                },
                {
                    path: '/repositories',
                    name: 'repostiories',
                    component: () => import('@/views/Repositories.vue')
                },
                {
                    path: '/repositories/:id/commits',
                    name: 'repo-commits',
                    component: () => import('@/views/Commits.vue')
                },
                {
                    path: '/commits',
                    name: 'commits',
                    component: () => import('@/views/Commits.vue')
                }
            ]
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue')
        },
        {
            path: '/auth/register',
            name: 'register',
            component: () => import('@/views/pages/auth/Register.vue')
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue')
        }
    ]
});

// Global navigation guard to protect routes
router.beforeEach((to, from, next) => {
    const publicPages = ['/auth/login', '/auth/register', '/auth/error'];
    const authRequired = !publicPages.includes(to.path);
    const apiKey = localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey');

    if (!authRequired && apiKey) {
        next('/'); // Redirect to dashboard if authenticated
    } else if (authRequired && !apiKey) {
        next('/auth/login'); // Redirect to login page if not authenticated
    } else {
        next(); // Allow access
    }
});

export default router;
