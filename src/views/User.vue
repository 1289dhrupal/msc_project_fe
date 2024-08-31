<script setup>
import { useToast } from 'primevue/usetoast';
import { onMounted, ref, watch } from 'vue';

const apiUrl = import.meta.env.VITE_API_URL;
const userProfile = ref({
    name: '',
    email: '',
    password: '',
    confirm_password: ''
});

const alerts = ref({
    sync: true,
    realtime: true,
    inactivity: true
});

const loading = ref(false);
const toast = useToast();

// Fetch user data
const fetchUserProfile = async () => {
    try {
        loading.value = true;
        const response = await fetch(`${apiUrl}/user`, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch user profile');

        const data = await response.json();
        if (data.success) {
            userProfile.value.name = data.data.user.name;
            userProfile.value.email = data.data.user.email;
            alerts.value.sync = data.data.alerts.sync;
            alerts.value.realtime = data.data.alerts.realtime;
            alerts.value.inactivity = data.data.alerts.inactivity;
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to retrieve user profile.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    } finally {
        loading.value = false;
    }
};

// Update user data
const updateUserProfile = async () => {
    try {
        loading.value = true;

        if (userProfile.value.password !== userProfile.value.confirm_password) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Passwords do not match.', life: 3000 });
            loading.value = false;
            return;
        }

        const requestData = {
            name: userProfile.value.name,
            password: userProfile.value.password
        };

        const response = await fetch(`${apiUrl}/user`, {
            method: 'POST',
            headers: {
                Authorization: localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) throw new Error('Failed to update user profile');

        const data = await response.json();
        if (data.success) {
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Profile updated successfully!', life: 3000 });
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to update profile.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    } finally {
        loading.value = false;
    }
};

// Watch for changes in the alerts object and update the server
watch(
    alerts,
    async () => {
        const requestData = {
            sync: alerts.value.sync,
            realtime: alerts.value.realtime,
            inactivity: alerts.value.inactivity
        };

        try {
            const response = await fetch(`${apiUrl}/user/alerts`, {
                method: 'POST',
                headers: {
                    Authorization: localStorage.getItem('apiKey'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) throw new Error('Failed to update alert preferences');

            const data = await response.json();
            if (data.success) {
                toast.add({ severity: 'success', summary: 'Successful', detail: 'Alert preferences updated successfully!', life: 3000 });
            } else {
                toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to update alert preferences.', life: 3000 });
            }
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
        }
    },
    { deep: true }
); // Ensure deep watching of the alerts object

onMounted(() => {
    fetchUserProfile();
});
</script>

<template>
    <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">User Profile</h1>

        <div class="card">
            <Fluid>
                <div class="flex flex-col md:flex-row gap-8">
                    <div class="md:w-1/2">
                        <div class="card flex flex-col gap-4">
                            <div class="font-semibold text-xl">Profile</div>

                            <div class="flex flex-col gap-2">
                                <label for="name">Name</label>
                                <InputText id="name" v-model="userProfile.name" placeholder="Enter your name" />
                            </div>

                            <div class="flex flex-col gap-2">
                                <label for="email">Email</label>
                                <InputText id="email" v-model="userProfile.email" :disabled="true" placeholder="Enter your email" />
                            </div>

                            <div class="flex flex-col gap-2">
                                <label for="password">Password</label>
                                <Password id="password" v-model="userProfile.password" placeholder="Enter a new password" toggleMask />
                            </div>

                            <div class="flex flex-col gap-2">
                                <label for="password">Confirm Password</label>
                                <Password id="password" v-model="userProfile.confirm_password" placeholder="Enter a new password" :feedback="false" :toggleMask="false" />
                            </div>

                            <div class="flex flex-col gap-2">
                                <Button label="Update Profile" icon="pi pi-save" @click="updateUserProfile" :loading="loading" />
                            </div>
                        </div>
                    </div>
                </div>
            </Fluid>
        </div>

        <div class="card">
            <Fluid>
                <div class="md:w-1/2">
                    <div class="card flex flex-col gap-4">
                        <div class="font-semibold text-xl">Alerts</div>

                        <div class="flex flex-col gap-4">
                            <div class="flex justify-between items-center">
                                <label for="sync-alert">Sync Alerts</label>
                                <InputSwitch id="sync-alert" v-model="alerts.sync" />
                            </div>

                            <div class="flex justify-between items-center">
                                <label for="realtime-alert">Realtime Alerts</label>
                                <InputSwitch id="realtime-alert" v-model="alerts.realtime" />
                            </div>

                            <div class="flex justify-between items-center">
                                <label for="inactivity-alert">Inactivity Alerts</label>
                                <InputSwitch id="inactivity-alert" v-model="alerts.inactivity" />
                            </div>
                        </div>
                    </div>
                </div>
            </Fluid>
        </div>
    </div>
</template>

<style scoped>
/* You can add any scoped styles here */
</style>
