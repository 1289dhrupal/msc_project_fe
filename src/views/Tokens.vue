<script setup>
import { computed, onMounted, ref, watch } from 'vue';

const tokens = ref([]);
const newToken = ref('');
const newUrl = ref('');
const newService = ref(null);
const newDescription = ref(''); // New description field
const errorMessage = ref('');
const successMessage = ref('');
const apiUrl = import.meta.env.VITE_API_URL; // Base API URL from environment variable

const displayConfirmation = ref(false); // State to control the visibility of the confirmation dialog
const selectedTokenId = ref(null); // Store the ID of the token to be deleted

// State for the balance frozen column
const balanceFrozen = ref(false);

// Get service options from the environment variable and map them to objects with 'name' and 'code'
const dropdownItems = ref(
    import.meta.env.VITE_SERVICE_OPTIONS.split(',').map((service) => ({
        name: service,
        code: service
    }))
);

// Watcher to automatically update and lock the URL when GitHub is selected
watch(newService, (service) => {
    if (service && service.code === 'github') {
        newUrl.value = 'https://github.com';
    } else {
        newUrl.value = ''; // Reset the URL if any other service is selected
    }
});

const descriptionLength = computed(() => newDescription.value.length);

const fetchTokens = async () => {
    try {
        const response = await fetch(`${apiUrl}/git-token/list`, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey'), // Removed 'Bearer ' prefix
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch tokens');

        const data = await response.json();
        if (data.success) {
            tokens.value = data.data;
            successMessage.value = 'Tokens retrieved successfully!';
        } else {
            errorMessage.value = 'Failed to retrieve tokens.';
        }
    } catch (error) {
        errorMessage.value = error.message;
    }
};

const addToken = async () => {
    if (!newService.value) {
        errorMessage.value = 'Please select a service.';
        return;
    }

    if (!newToken.value) {
        errorMessage.value = 'Please enter a token.';
        return;
    }

    if (!newUrl.value) {
        errorMessage.value = 'Please enter a url.';
        return;
    }
    if (newDescription.value.length > 150) {
        errorMessage.value = 'Description must be 150 characters or less.';
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/git-token/store`, {
            method: 'POST',
            headers: {
                Authorization: localStorage.getItem('apiKey'), // Removed 'Bearer ' prefix
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: newToken.value,
                url: newUrl.value,
                service: newService.value.code,
                description: newDescription.value // Include the description in the API call
            })
        });

        if (!response.ok) throw new Error('Failed to add token');

        const data = await response.json();
        if (data.success) {
            successMessage.value = data.message || 'Token added successfully!';
            newToken.value = ''; // Clear the input after successful submission
            newUrl.value = ''; // Clear the input after successful submission
            newService.value = null; // Reset the dropdown after successful submission
            newDescription.value = ''; // Clear the description after successful submission
            fetchTokens(); // Refresh the tokens list
        } else {
            errorMessage.value = data.message || 'Failed to add token.';
        }
    } catch (error) {
        errorMessage.value = error.message;
    }
};

const deleteToken = async (id) => {
    try {
        const response = await fetch(`${apiUrl}/git-token/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: localStorage.getItem('apiKey'), // Removed 'Bearer ' prefix
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to delete token');

        const data = await response.json();
        if (data.success) {
            successMessage.value = data.message || 'Token deleted successfully!';
            fetchTokens(); // Refresh the tokens list
        } else {
            errorMessage.value = data.message || 'Failed to delete token.';
        }
    } catch (error) {
        errorMessage.value = error.message;
    }
};

// Handle toggle change
const handleToggleChange = (id, currentStatus) => {
    const newStatus = !currentStatus;
    toggleTokenStatus(id, newStatus);
};

const toggleTokenStatus = async (id, newStatus) => {
    try {
        const response = await fetch(`${apiUrl}/git-token/${id}/toggle`, {
            method: 'POST',
            headers: {
                Authorization: localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_disabled: newStatus
            })
        });

        if (!response.ok) throw new Error('Failed to update token status');

        const data = await response.json();
        if (data.success) {
            successMessage.value = data.message || 'Token status updated successfully!';
            fetchTokens(); // Refresh the tokens list
        } else {
            errorMessage.value = data.message || 'Failed to update token status.';
        }
    } catch (error) {
        errorMessage.value = error.message;
    }
};

// Open confirmation dialog
const openConfirmation = (id) => {
    selectedTokenId.value = id;
    displayConfirmation.value = true;
};

// Close confirmation dialog
const closeConfirmation = () => {
    displayConfirmation.value = false;
    selectedTokenId.value = null;
};

// Confirm deletion
const confirmDeletion = () => {
    if (selectedTokenId.value !== null) {
        deleteToken(selectedTokenId.value);
    }
    closeConfirmation();
};

onMounted(() => {
    fetchTokens();
});
</script>

<template>
    <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">Manage Tokens</h1>

        <div class="flex flex-col gap-4 mb-4" style="min-height: 50px">
            <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
            <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        </div>

        <div class="card flex flex-col gap-4">
            <div class="font-semibold text-xl">Add New Token</div>
            <div class="flex flex-wrap items-start gap-4">
                <div class="field w-full">
                    <label for="service" class="sr-only">Service</label>
                    <Select id="service" v-model="newService" :options="dropdownItems" optionLabel="name" placeholder="Select One" class="w-full" />
                </div>
                <div class="field w-full">
                    <label for="token" class="sr-only">Token</label>
                    <InputText id="token" v-model="newToken" type="text" placeholder="Git API Token" class="w-full" />
                </div>
                <div class="field w-full">
                    <label for="url" class="sr-only">Git Service Url</label>
                    <InputText id="url" v-model="newUrl" type="text" placeholder="https://github.com" class="w-full" :readonly="newService && newService.code === 'github'" :class="{ 'readonly-input': newService && newService.code === 'github' }" />
                </div>
                <div class="field w-full">
                    <label for="description" class="sr-only">Description</label>
                    <InputText id="description" v-model="newDescription" type="text" placeholder="Description..." class="w-full" maxlength="150" />
                    <small>{{ descriptionLength }} of 150 characters</small>
                </div>
                <Button label="Add Token" :fluid="false" @click="addToken"></Button>
            </div>
        </div>

        <div class="card mt-6">
            <div class="font-semibold text-xl mb-4">Tokens List</div>
            <ToggleButton v-model="balanceFrozen" onIcon="pi pi-lock" offIcon="pi pi-lock-open" onLabel="Action" offLabel="Action" />

            <DataTable :value="tokens" scrollable scrollHeight="400px" class="mt-6">
                <Column header="Token" style="min-width: 150px" frozen class="font-bold">
                    <template #body="{ data }">
                        <router-link class="underline ml-2 text-right cursor-pointer text-primary font-bold" :to="`/repositories?git_token_id=${data.id}`">
                            <span v-tooltip="{ value: 'View Repositories', hideDelay: 100 }" class="mr-2">{{ data.token }}</span>
                        </router-link>
                    </template>
                </Column>
                <Column field="id" header="ID" style="min-width: 150px"></Column>
                <Column field="service" header="Service" style="min-width: 150px"></Column>
                <Column field="description" header="Description" style="min-width: 150px">
                    <template #body="{ data }">
                        <span>{{ data.description || 'No description' }}</span>
                    </template>
                </Column>
                <Column field="created_at" header="Created At" style="min-width: 150px"></Column>
                <Column field="last_fetched_at" header="Last Fetched" style="min-width: 150px"></Column>
                <Column header="Actions" alignFrozen="right" style="min-width: 150px" :frozen="balanceFrozen">
                    <template #body="{ data }">
                        <div class="flex items-center">
                            <!-- <router-link class="font-medium no-underline ml-2 text-right cursor-pointer text-blue-500" :to="`/repositories?git_token_id=${data.id}`">
                                <Button v-tooltip="{ value: 'View Repositories', hideDelay: 1000 }" icon="pi pi-eye" class="mx-2 p-button-primary mx-2" rounded></Button>
                            </router-link> -->
                            <Button icon="pi pi-trash" class="mx-2 p-button-danger mx-2" rounded @click="openConfirmation(data.id)"></Button>
                            <ToggleSwitch v-tooltip="{ value: 'Disable this Token', hideDelay: 1000 }" :modelValue="!data.is_disabled" class="mx-2" @change="handleToggleChange(data.id, data.is_disabled)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog header="Confirmation" v-model:visible="displayConfirmation" :style="{ width: '350px' }" :modal="true">
            <div class="flex items-center justify-center">
                <i class="pi pi-exclamation-triangle mr-4" style="font-size: 2rem" />
                <span>Are you sure you want to proceed?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="closeConfirmation" text severity="secondary" />
                <Button label="Yes" icon="pi pi-check" @click="confirmDeletion" severity="danger" outlined autofocus />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.readonly-input {
    background: var(--p-inputtext-disabled-background);
    color: var(--p-inputtext-disabled-color);
    cursor: not-allowed; /* Optionally keep this for cursor change */
}
</style>
