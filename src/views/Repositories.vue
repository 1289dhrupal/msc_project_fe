<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const repositories = ref([]);
const gitTokens = ref([]);
const selectedToken = ref(null);
const searchQuery = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const apiUrl = import.meta.env.VITE_API_URL;

const displayConfirmation = ref(false);
const selectedRepositoryId = ref(null);

const balanceFrozen = ref(false);

const router = useRouter();
const route = useRoute();

const fetchRepositories = async (tokenId = null) => {
    try {
        const fetchUrl = tokenId ? `${apiUrl}/git/repositories/list?git_token_id=${tokenId}` : `${apiUrl}/git/repositories/list`;

        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch repositories');

        const data = await response.json();
        if (data.success) {
            repositories.value = data.data.repositories;
            gitTokens.value = data.data.git_tokens;
        } else {
            errorMessage.value = 'Failed to retrieve repositories.';
        }
    } catch (error) {
        errorMessage.value = error.message;
    }
};

const filteredRepositories = computed(() => {
    if (!searchQuery.value) return repositories.value;

    const lowerCaseQuery = searchQuery.value.toLowerCase();
    return repositories.value.filter((repo) => repo.name.toLowerCase().includes(lowerCaseQuery) || repo.owner.toLowerCase().includes(lowerCaseQuery));
});

const onTokenSelect = () => {
    if (selectedToken.value) {
        router.push(`/repositories?git_token_id=${selectedToken.value.id}`);
    }
    fetchRepositories(selectedToken.value.id);
};

// const goBackToAllRepositories = () => {
//     router.push('/repositories');
// };

const deleteRepository = async (id) => {
    try {
        const response = await fetch(`${apiUrl}/git/repositories/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to delete repository');

        const data = await response.json();
        if (data.success) {
            successMessage.value = data.message || 'Repository deleted successfully!';
            fetchRepositories(route.query.git_token_id);
        } else {
            errorMessage.value = data.message || 'Failed to delete repository.';
        }
    } catch (error) {
        errorMessage.value = error.message;
    }
};

const handleToggleChange = (id, currentStatus) => {
    const newStatus = !currentStatus;
    toggleRepositoryStatus(id, newStatus);
};

const toggleRepositoryStatus = async (id, newStatus) => {
    try {
        const response = await fetch(`${apiUrl}/git/repositories/${id}/toggle`, {
            method: 'POST',
            headers: {
                Authorization: localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_disabled: newStatus
            })
        });

        if (!response.ok) throw new Error('Failed to update repository status');

        const data = await response.json();
        if (data.success) {
            successMessage.value = data.message || 'Repository status updated successfully!';
            fetchRepositories(route.query.git_token_id);
        } else {
            errorMessage.value = data.message || 'Failed to update repository status.';
        }
    } catch (error) {
        errorMessage.value = error.message;
    }
};

const openConfirmation = (id) => {
    selectedRepositoryId.value = id;
    displayConfirmation.value = true;
};

const closeConfirmation = () => {
    displayConfirmation.value = false;
    selectedRepositoryId.value = null;
};

const confirmDeletion = () => {
    if (selectedRepositoryId.value !== null) {
        deleteRepository(selectedRepositoryId.value);
    }
    closeConfirmation();
};

onMounted(() => {
    fetchRepositories(route.query.git_token_id);
});

watch(route, (newRoute) => {
    if (!newRoute.query.git_token_id) {
        fetchRepositories();
    }
});
</script>
<template>
    <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">Manage Repositories</h1>

        <!-- Dropdown to select token (only shown when not filtering by token) -->
        <div v-if="!route.query.git_token_id" class="mb-4">
            <Select v-model="selectedToken" :options="gitTokens" optionLabel="token" placeholder="Select a Token to filter repositories" class="w-full" @change="onTokenSelect" />
        </div>

        <div v-if="route.query.git_token_id" class="mb-4">
            <Button label="Go Back" icon="pi pi-arrow-left" class="p-button-secondary" @click="$router.go(-1)" />
        </div>

        <div class="flex flex-col gap-4 mb-4" style="min-height: 50px">
            <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
            <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        </div>

        <div class="card mt-6">
            <div class="font-semibold text-xl mb-4">Repositories List ({{ filteredRepositories.length !== 0 ? filteredRepositories.length : 'No repositories found' }})</div>
            <div class="flex justify-between items-center mb-4">
                <div>
                    <ToggleButton v-model="balanceFrozen" onIcon="pi pi-lock" offIcon="pi pi-lock-open" onLabel="Action" offLabel="Action" />
                </div>
                <div class="w-full max-w-xs">
                    <InputText v-model="searchQuery" placeholder="Search by name or owner" class="w-full" />
                </div>
            </div>

            <DataTable :value="filteredRepositories" scrollable scrollHeight="400px" class="mt-6">
                <Column field="id" header="ID" style="min-width: 150px"></Column>
                <Column field="url" header="Repository" style="min-width: 200px" frozen class="font-bold">
                    <template #body="{ data }">
                        <div class="flex items-center">
                            <router-link class="font-bold underline ml-2 text-right cursor-pointer text-primary" :to="`/repositories/${data.id}/commits`">
                                <span v-tooltip="{ value: 'View Commits', hideDelay: 100 }" class="mr-2">{{ data.owner }}/{{ data.name }}</span>
                            </router-link>

                            <a :href="data.url" target="_blank" class="text-blue-500 underline">
                                <i class="pi pi-external-link" />
                            </a>
                        </div>
                    </template>
                </Column>
                <Column field="owner" header="Owner" style="min-width: 150px"></Column>
                <Column field="created_at" header="Created At" style="min-width: 150px"></Column>
                <Column field="last_fetched_at" header="Last Fetched" style="min-width: 150px"></Column>
                <Column header="Actions" alignFrozen="right" style="min-width: 150px" :frozen="balanceFrozen">
                    <template #body="{ data }">
                        <div class="flex items-center">
                            <!-- <router-link class="font-medium no-underline ml-2 text-right cursor-pointer text-blue-500" :to="`/repositories/${data.id}/commits`">
                                <Button v-tooltip="{ value: 'View Commits', hideDelay: 1000 }" icon="pi pi-eye" class="mx-2 p-button-primary mx-2" rounded></Button>
                            </router-link>
 -->
                            <Button icon="pi pi-trash" class="mx-2 p-button-danger" rounded @click="openConfirmation(data.id)" />
                            <ToggleSwitch v-tooltip="{ value: 'Disable this Repository', hideDelay: 1000 }" :modelValue="!data.is_disabled" class="mx-2" @change="handleToggleChange(data.id, data.is_disabled)" />
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
