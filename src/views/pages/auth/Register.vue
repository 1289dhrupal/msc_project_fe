<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const name = ref('');
const email = ref('');
const password = ref('');

// State for handling the visibility and message of the tags
const infoMessage = ref('Register to get started');
const successMessage = ref('');
const errorMessage = ref('');

const router = useRouter();

// Get the API base URL and allowed email domains from environment variables
const apiUrl = import.meta.env.VITE_API_URL;
const allowedDomains = import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS;

const isEmailAllowed = (email) => {
    if (!email) return false;
    const domain = email.split('@')[1];
    return allowedDomains.split(',').includes(domain);
};

const submitRegister = async () => {
    if (!name.value || !email.value || !password.value) {
        errorMessage.value = 'All fields are required.';
        successMessage.value = '';
        infoMessage.value = '';
        return;
    }

    if (!isEmailAllowed(email.value)) {
        errorMessage.value = 'Registration is restricted to certain email domains.';
        successMessage.value = '';
        infoMessage.value = '';
        return;
    }

    try {
        const formData = new FormData();
        formData.append('name', name.value);
        formData.append('email', email.value);
        formData.append('password', password.value);

        const response = await fetch(`${apiUrl}/register`, {
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

        // Redirect to login with a success message
        router.push({
            name: 'login',
            query: { successMessage: data.message }
        });
    } catch (error) {
        console.error('Error during registration:', error);
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
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Create an Account</div>
                        <span class="text-muted-color font-medium">Register to get started</span>
                    </div>

                    <!-- Display the success or error message using v-if -->
                    <Tag v-if="successMessage" icon="pi pi-check" severity="success" :value="successMessage" class="mb-4"></Tag>
                    <Tag v-if="errorMessage" icon="pi pi-times" severity="danger" :value="errorMessage" class="mb-4"></Tag>

                    <div>
                        <label for="name" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Name</label>
                        <InputText id="name" type="text" placeholder="Your Name" class="w-full md:w-[30rem] mb-8" v-model="name" />

                        <label for="email" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                        <InputText id="email" type="email" placeholder="Email address" class="w-full md:w-[30rem] mb-8" v-model="email" />

                        <label for="password" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
                        <Password id="password" v-model="password" placeholder="Password" :toggleMask="true" class="mb-4" fluid :feedback="false"></Password>

                        <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                            <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Already have an account? <router-link to="/auth/login" class="text-primary">Login</router-link></span>
                        </div>

                        <!-- Button to submit the form -->
                        <Button label="Register" class="w-full" @click="submitRegister"></Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
