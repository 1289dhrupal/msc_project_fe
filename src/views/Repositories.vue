<script setup>
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const repositories = ref([]);
const gitTokens = ref([]);
const selectedTokenId = ref([]);
const searchQuery = ref('');
const apiUrl = import.meta.env.VITE_API_URL;

const displayConfirmation = ref(false);
const selectedRepositoryId = ref(null);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const router = useRouter();
const route = useRoute();
const toast = useToast();
const dt = ref(null); // Reference for the DataTable

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
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to retrieve repositories.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const filteredRepositories = computed(() => {
    if (!searchQuery.value) return repositories.value;

    const lowerCaseQuery = searchQuery.value.toLowerCase();
    return repositories.value.filter(
        (repo) =>
            repo.name.toLowerCase().includes(lowerCaseQuery) ||
            repo.owner.toLowerCase().includes(lowerCaseQuery) ||
            repo.url.toLowerCase().includes(lowerCaseQuery) ||
            repo.created_at.toLowerCase().includes(lowerCaseQuery) ||
            repo.last_fetched_at.toLowerCase().includes(lowerCaseQuery)
    );
});

const onTokenSelect = () => {
    if (selectedTokenId.value) {
        router.push(`/repositories?git_token_id=${selectedTokenId.value.id}`);
    }
    fetchRepositories(selectedTokenId.value.id);
};

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
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Repository deleted successfully!', life: 3000 });
            fetchRepositories(route.query.git_token_id);
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to delete repository.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
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
                is_active: !newStatus
            })
        });

        if (!response.ok) throw new Error('Failed to update repository status');

        const data = await response.json();
        if (data.success) {
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Repository status updated successfully!', life: 3000 });
            fetchRepositories(route.query.git_token_id);
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to update repository status.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
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

const customExportFunction = (cell) => {
    switch (cell.field) {
        case 'is_active':
            return cell.data ? 'Active' : 'Inactive';
        default:
            return cell.data;
    }
};

const exportCSV = () => {
    dt.value.exportCSV();
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
    <div class="pt-4">
        <h1 class="text-2xl font-bold mb-4">Manage Repositories</h1>

        <div v-if="route.query.git_token_id" class="mb-4">
            <Button label="Go Back" icon="pi pi-arrow-left" class="p-button-secondary" @click="$router.go(-1)" />
        </div>

        <div class="card">
            <Toolbar class="mb-6">
                <template #start v-if="!route.query.git_token_id">
                    <!-- Dropdown to select token (only shown when not filtering by token) -->
                    <Select v-model="selectedTokenId" :options="gitTokens" optionLabel="token" placeholder="Select a Token to filter repositories" class="w-full" @change="onTokenSelect" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                :value="filteredRepositories"
                dataKey="id"
                :exportFilename="`repositories_${new Date().getTime()}`"
                :exportFunction="customExportFunction"
                :paginator="true"
                :rows="10"
                :filters="filters"
                scrollable
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} repositories"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <div class="font-semibold text-xl mb-4">Repository List ({{ filteredRepositories.length !== 0 ? filteredRepositories.length : 'No repositories found' }})</div>
                        <InputText v-model="filters['global'].value" placeholder="Search..." />
                    </div>
                </template>

                <Column field="id" header="ID" sortable frozen style="min-width: 150px"></Column>
                <Column field="url" header="Repository" sortable style="min-width: 200px">
                    <template #body="slotProps">
                        <div class="flex items-center">
                            <router-link class="font-bold underline text-right text-primary mr-1" :to="`/repositories/${slotProps.data.id}/commits`">
                                <span v-tooltip="{ value: 'View Commits', hideDelay: 100 }" class="ml-1">{{ slotProps.data.owner }}/{{ slotProps.data.name }}</span>
                            </router-link>

                            <a :href="slotProps.data.url" target="_blank" class="text-blue-500 underline">
                                <i class="pi pi-external-link" />
                            </a>
                        </div>
                    </template>
                </Column>
                <Column field="name" header="Repository Name" sortable style="min-width: 150px"></Column>
                <Column field="owner" header="Owner" sortable style="min-width: 150px"></Column>
                <Column field="description" header="Description" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <span>{{ slotProps.data.description ? slotProps.data.description : 'No Description' }}</span>
                    </template>
                </Column>
                <Column field="created_at" header="Created At" sortable style="min-width: 150px"></Column>
                <Column field="last_fetched_at" header="Last Fetched" sortable style="min-width: 150px"></Column>
                <Column field="is_active" header="Status" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <Tag class="uppercase" :value="slotProps.data.is_active ? 'Active' : 'Inactive'" :severity="slotProps.data.is_active ? 'success' : 'danger'" />
                    </template>
                </Column>
                <Column header="Actions" alignFrozen="right" style="min-width: 150px" frozen :exportable="false">
                    <template #body="slotProps">
                        <div class="flex items-center">
                            <Button icon="pi pi-trash" class="mr-1" outlined rounded severity="danger" @click="openConfirmation(slotProps.data.id)" />
                            <ToggleSwitch
                                v-model="slotProps.data.is_active"
                                v-tooltip="{ value: slotProps.data.is_active ? 'Deactivate this Token' : 'Activate this Token', hideDelay: 1000 }"
                                class="ml-1"
                                @change="handleToggleChange(slotProps.data.id, slotProps.data.is_active)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="displayConfirmation" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Are you sure you want to delete this token?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" severity="info" @click="closeConfirmation" />
                <Button label="Delete" icon="pi pi-check" severity="danger" @click="confirmDeletion" />
            </template>
        </Dialog>
    </div>
</template>
