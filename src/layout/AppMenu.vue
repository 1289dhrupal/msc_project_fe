<script setup>
import router from '@/router';
import { ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'Home',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' }]
    },
    {
        label: 'Code Management',
        items: [
            { label: 'Access Tokens', icon: 'pi pi-fw pi-key', to: '/tokens' },
            { label: 'Repositories', icon: 'pi pi-fw pi-folder', to: '/repositories' },
            { label: 'Commits', icon: 'pi pi-fw pi-clock', to: '/commits' }
        ]
    },
    {
        label: 'User',
        items: [{ label: 'Profile', icon: 'pi pi-fw pi-user', to: '/user' }]
    }
]);

function logout() {
    // Remove the API key from both localStorage and sessionStorage
    localStorage.removeItem('apiKey');
    sessionStorage.removeItem('apiKey');

    // Redirect to the login page
    router.push('/auth/login');
}
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
    <div class="layout-menu-button pt-4">
        <Button iconPos="right" class="w-full" label="Logout" icon="pi pi-sign-out" @click="logout" />
    </div>
</template>

<style lang="scss" scoped></style>
