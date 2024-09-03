<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const email = ref('');
const token = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const apiUrl = import.meta.env.VITE_API_URL;

// State for handling the visibility and message of the tags
const infoMessage = ref('Reset your password');
const successMessage = ref('');
const errorMessage = ref('');

const route = useRoute();
const router = useRouter();

// On mount, get the email and token from the query parameters
onMounted(() => {
    email.value = route.query.email || '';
    token.value = route.query.token || '';
});

const submitResetPassword = async () => {
    if (!newPassword.value || !confirmPassword.value) {
        errorMessage.value = 'Both password fields are required.';
        successMessage.value = '';
        infoMessage.value = '';
        return;
    }

    if (newPassword.value !== confirmPassword.value) {
        errorMessage.value = 'Passwords do not match.';
        successMessage.value = '';
        infoMessage.value = '';
        return;
    }

    try {
        const formData = new FormData();
        formData.append('email', email.value);
        formData.append('token', token.value);
        formData.append('new_password', newPassword.value);

        const response = await fetch(`${apiUrl}/reset-password`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const data = await response.json();
            errorMessage.value = data.message; // Set the error message
            successMessage.value = ''; // Clear the success message
            infoMessage.value = ''; // Clear the info message
            throw new Error(data.message);
        }

        const data = await response.json();
        successMessage.value = data.message;
        errorMessage.value = ''; // Set the error message
        infoMessage.value = ''; // Clear the info message

        // Redirect to login with a success message
        router.push({
            name: 'login',
            query: { successMessage: data.message }
        });
    } catch (error) {
        console.error('Error during password reset:', error);
        errorMessage.value = error.message; // Display error message
        successMessage.value = ''; // Clear the success message
        infoMessage.value = ''; // Clear the info message
    }
};
</script>
<template>
    <FloatingConfigurator />
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                    <div class="text-center mb-8">
                        <svg viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="mb-8 w-16 shrink-0 mx-auto">
                            <!-- SVG content here -->
                        </svg>
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Reset Your Password</div>
                        <span class="text-muted-color font-medium">Reset your password to regain access</span>
                    </div>

                    <!-- Display the success or error message using v-if -->
                    <Tag v-if="successMessage" icon="pi pi-check" severity="success" :value="successMessage" class="mb-4"></Tag>
                    <Tag v-if="errorMessage" icon="pi pi-times" severity="danger" :value="errorMessage" class="mb-4"></Tag>

                    <div>
                        <input type="hidden" v-model="token" />

                        <label for="email" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                        <InputText id="email" type="email" placeholder="Email address" class="w-full md:w-[30rem] mb-8" v-model="email" readonly />

                        <label for="newPassword" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">New Password</label>
                        <Password id="newPassword" v-model="newPassword" placeholder="New Password" :toggleMask="true" class="mb-4" fluid :feedback="true"></Password>

                        <label for="confirmPassword" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Confirm New Password</label>
                        <Password id="confirmPassword" v-model="confirmPassword" placeholder="Confirm New Password" :toggleMask="true" class="mb-4" fluid :feedback="true"></Password>

                        <!-- Button to submit the form -->
                        <Button label="Reset Password" class="w-full" @click="submitResetPassword"></Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
