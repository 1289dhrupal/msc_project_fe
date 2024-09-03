<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const rememberMe = ref(false); // State for the "Remember Me" checkbox

// State for handling the visibility and message of the tags
const infoMessage = ref('Sign in to continue');
const successMessage = ref('');
const errorMessage = ref('');

const route = useRoute();
const router = useRouter();

onMounted(() => {
    // Check if route.query exists and has successMessage
    const querySuccessMessage = route.query.successMessage;
    if (querySuccessMessage) {
        successMessage.value = querySuccessMessage;
        infoMessage.value = ''; // Clear the default info message if there's a success message
    }
});

// Get the API base URL and allowed email domains from environment variables
const apiUrl = import.meta.env.VITE_API_URL;
const allowedDomains = import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS;

const isEmailAllowed = (email) => {
    if (!email) return false;
    const domain = email.split('@')[1];
    return allowedDomains.split(',').includes(domain);
};

const submitLogin = async () => {
    if (!email.value) {
        errorMessage.value = 'Email is required.';
        successMessage.value = '';
        infoMessage.value = '';
        return;
    }

    if (!isEmailAllowed(email.value)) {
        errorMessage.value = 'Login is restricted to certain email domains.';
        successMessage.value = '';
        infoMessage.value = '';
        return;
    }

    try {
        const formData = new FormData();
        formData.append('email', email.value);
        formData.append('password', password.value);

        const response = await fetch(`${apiUrl}/login`, {
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
        const apiKey = data.data.apiKey;

        // Store the API key in the appropriate storage
        if (rememberMe.value) {
            localStorage.setItem('apiKey', apiKey);
        } else {
            sessionStorage.setItem('apiKey', apiKey);
        }

        successMessage.value = data.message; // Set the success message
        errorMessage.value = ''; // Clear the error message
        infoMessage.value = ''; // Clear the info message

        // Redirect to the dashboard
        router.push('/');
    } catch (error) {
        console.error('Error during login:', error);
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
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Welcome!</div>

                        <!-- Info tag displayed by default -->
                        <Tag v-if="infoMessage" severity="info" :value="infoMessage" :rounded="true" class="mb-4"></Tag>

                        <!-- Display the success or error message using v-if -->
                        <Tag v-if="successMessage" icon="pi pi-check" severity="success" :value="successMessage" class="mb-4"></Tag>
                        <Tag v-if="errorMessage" icon="pi pi-times" severity="danger" :value="errorMessage" class="mb-4"></Tag>
                    </div>

                    <div>
                        <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                        <InputText id="email1" type="text" placeholder="Email address" class="w-full md:w-[30rem] mb-8" v-model="email" />

                        <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
                        <Password id="password1" v-model="password" placeholder="Password" :toggleMask="true" class="mb-4" fluid :feedback="false" />

                        <!-- "Remember Me" checkbox -->
                        <div class="flex items-center mb-8">
                            <Checkbox id="rememberMe" name="rememberMe" :value="true" v-model="rememberMe" />
                            <label for="rememberMe" class="ml-2 text-surface-900 dark:text-surface-0">Remember Me</label>
                        </div>

                        <!-- TODO: forgot password is not functional -->
                        <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                            <div class="flex items-center">
                                <router-link to="/auth/register" class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Register</router-link>
                            </div>
                            <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Forgot password?</span>
                        </div>

                        <!-- Button to submit the form -->
                        <Button label="Sign In" class="w-full" @click="submitLogin"></Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
