<script setup>
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

const tokens = ref([]);
const newToken = ref('');
const newUrl = ref('');
const newService = ref(null);
const newDescription = ref('');
const apiUrl = import.meta.env.VITE_API_URL;
const displayConfirmation = ref(false);
const isEdit = ref(false);
const selectedTokenId = ref(null);
const dropdownItems = ref(
    import.meta.env.VITE_SERVICE_OPTIONS.split(',').map((service) => ({
        name: service,
        code: service
    }))
);
const descriptionLength = computed(() => newDescription.value.length);
const toast = useToast();
const tokenDialog = ref(false);
const submitted = ref(false);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const dt = ref(null); // Reference for the DataTable

const fetchTokens = async () => {
    try {
        const response = await fetch(`${apiUrl}/git-token/list`, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch tokens');

        const data = await response.json();
        if (data.success) {
            tokens.value = data.data;
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to retrieve tokens.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const addToken = async () => {
    submitted.value = true;

    if (!newService.value || !newToken.value || !newUrl.value || newDescription.value.length > 150) {
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/git-token/store`, {
            method: 'POST',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: newToken.value,
                url: newUrl.value,
                service: newService.value.code,
                description: newDescription.value
            })
        });

        if (!response.ok) throw new Error('Failed to add token');

        const data = await response.json();
        if (data.success) {
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Token added successfully!', life: 3000 });
            resetForm();
            fetchTokens();
            tokenDialog.value = false;
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to add token.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const updateToken = async () => {
    if (selectedTokenId.value === null) {
        return;
    }

    submitted.value = true;

    if (!newService.value || !newToken.value || !newUrl.value || newDescription.value.length > 150) {
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/git-token/${selectedTokenId.value}/edit`, {
            method: 'POST',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: newToken.value,
                url: newUrl.value,
                service: newService.value.code,
                description: newDescription.value
            })
        });

        if (!response.ok) throw new Error('Failed to add token');

        const data = await response.json();
        if (data.success) {
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Token added successfully!', life: 3000 });
            resetForm();
            fetchTokens();
            tokenDialog.value = false;
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to add token.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const deleteToken = async (id) => {
    try {
        const response = await fetch(`${apiUrl}/git-token/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to delete token');

        const data = await response.json();
        if (data.success) {
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Token deleted successfully!', life: 3000 });
            fetchTokens();
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to delete token.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const handleToggleChange = (id, currentStatus) => {
    const newStatus = !currentStatus;
    toggleTokenStatus(id, newStatus);
};

const toggleTokenStatus = async (id, newStatus) => {
    try {
        const response = await fetch(`${apiUrl}/git-token/${id}/toggle`, {
            method: 'POST',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_active: !newStatus
            })
        });

        if (!response.ok) throw new Error('Failed to update token status');

        const data = await response.json();
        if (data.success) {
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Token status updated successfully!', life: 3000 });
            fetchTokens();
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to update token status.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const openConfirmation = (id) => {
    selectedTokenId.value = id;
    displayConfirmation.value = true;
};

const closeConfirmation = () => {
    displayConfirmation.value = false;
    selectedTokenId.value = null;
};

const confirmDeletion = () => {
    if (selectedTokenId.value !== null) {
        deleteToken(selectedTokenId.value);
    }
    closeConfirmation();
};

const openNewTokenDialog = () => {
    resetForm();
    tokenDialog.value = true;
};

const openEditTokenDialog = (id) => {
    tokens.value.filter((token) => {
        if (token.id === id) {
            newToken.value = token.token;
            newUrl.value = token.url;
            newService.value = dropdownItems.value.find((item) => item.code === token.service);
            newDescription.value = token.description;
            submitted.value = false;
            tokenDialog.value = true;
            selectedTokenId.value = id;
            isEdit.value = true;
        }
    });
};

const hideDialog = () => {
    tokenDialog.value = false;
    submitted.value = false;
};

const resetForm = () => {
    newToken.value = '';
    newUrl.value = '';
    newService.value = null;
    newDescription.value = '';
    submitted.value = false;
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
    fetchTokens();
});

watch(newService, (service) => {
    if (service && service.code === 'github') {
        newUrl.value = 'https://github.com';
    } else {
        // newUrl.value = '';
    }
});
</script>

<template>
    <div class="pt-4">
        <h1 class="text-2xl font-bold mb-4">Manage Tokens</h1>

        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNewTokenDialog" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedTokenId"
                :value="tokens"
                dataKey="id"
                :exportFilename="`tokens_${new Date().getTime()}`"
                :exportFunction="customExportFunction"
                :paginator="true"
                :rows="10"
                :filters="filters"
                scrollable
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tokens"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <div class="font-semibold text-xl mb-4">Tokens List ({{ tokens.length !== 0 ? tokens.length : 'No tokens found' }})</div>
                        <InputText v-model="filters['global'].value" placeholder="Search..." />
                    </div>
                </template>

                <Column field="id" header="ID" sortable frozen style="min-width: 150px"></Column>
                <Column field="token" header="Token" sortable class="font-bold underline text-primary" style="min-width: 150px">
                    <template #body="slotProps">
                        <router-link :to="`/repositories?git_token_id=${slotProps.data.id}`" class="underline text-primary" v-tooltip="{ value: 'View Repositories', hideDelay: 100 }">{{ slotProps.data.token }}</router-link>
                    </template>
                </Column>
                <Column field="service" header="Service" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <div class="flex items-center">
                            <a :href="slotProps.data.url" target="_blank" class="ml-1 text-blue-500 underline">
                                <i class="pi pi-external-link" />
                            </a>
                            <span class="ml-1 font-bold" style="text-transform: capitalize">{{ slotProps.data.service }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="url" header="URL" :hidden="true"></Column>
                <Column field="description" header="Description" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <span>{{ slotProps.data.description ? slotProps.data.description : 'No Description' }}</span>
                    </template>
                </Column>
                <Column field="created_at" header="Created At" sortable style="min-width: 150px"></Column>
                <Column field="last_fetched_at" header="Last Fetched" sortable style="min-width: 150px"></Column>
                <Column field="is_active" header="Status" sortable style="min-width: 100px">
                    <template #body="slotProps">
                        <Tag class="uppercase" :value="slotProps.data.is_active ? 'Active' : 'Inactive'" :severity="slotProps.data.is_active ? 'success' : 'danger'" />
                    </template>
                </Column>
                <Column header="Actions" :exportable="false" alignFrozen="right" frozen style="min-width: 150px">
                    <template #body="slotProps">
                        <div class="flex items-center">
                            <Button icon="pi pi-pencil" class="ml-1" v-tooltip="{ value: 'Edit Token', hideDelay: 100 }" outlined rounded severity="warning" @click="openEditTokenDialog(slotProps.data.id)" />
                            <!-- <Button icon="pi pi-chart-line" class="mr-1" v-tooltip="{ value: 'View Analysis', hideDelay: 100 }" outlined rounded severity="info" @click="openConfirmation(slotProps.data.id)" /> -->
                            <Button icon="pi pi-trash" class="mr-1" outlined rounded severity="danger" @click="openConfirmation(slotProps.data.id)" />
                            <ToggleSwitch
                                v-model="slotProps.data.is_active"
                                v-tooltip="{ value: slotProps.data.is_active ? 'Deactivate this Token' : 'Activate this Token', hideDelay: 100 }"
                                class="ml-1"
                                @change="handleToggleChange(slotProps.data.id, slotProps.data.is_active)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="tokenDialog" :style="{ width: '450px' }" header="Token Details" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="service" class="block font-bold mb-3">Service</label>
                    <Select id="service" v-model="newService" :options="dropdownItems" optionLabel="name" placeholder="Select a Service" fluid />
                    <small v-if="submitted && !newService.value" class="text-red-500">Service is required.</small>
                </div>

                <div>
                    <label for="token" class="block font-bold mb-3">Token</label>
                    <InputText id="token" v-model="newToken" required="true" :invalid="submitted && !newToken.value" fluid />
                    <small v-if="submitted && !newToken.value" class="text-red-500">Token is required.</small>
                </div>

                <div>
                    <label for="url" class="block font-bold mb-3">URL</label>
                    <InputText id="url" v-model="newUrl" required="true" :invalid="submitted && !newUrl.value" :readonly="newService && newService.code === 'github'" :class="{ 'readonly-input': newService && newService.code === 'github' }" fluid />
                    <small v-if="submitted && !newUrl.value" class="text-red-500">URL is required.</small>
                </div>

                <div>
                    <label for="description" class="block font-bold mb-3">Description</label>
                    <Textarea id="description" v-model="newDescription" rows="3" cols="20" fluid />
                    <small>{{ descriptionLength }} of 150 characters</small>
                    <small v-if="submitted && newDescription.value.length > 150" class="text-red-500">Description must be 150 characters or less.</small>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" severity="danger" outlined text @click="hideDialog" />
                <Button v-if="isEdit" label="Save" icon="pi pi-check" @click="updateToken" />
                <Button v-else label="Save" icon="pi pi-check" @click="addToken" />
            </template>
        </Dialog>

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

<style scoped>
.readonly-input {
    background: var(--p-inputtext-disabled-background);
    color: var(--p-inputtext-disabled-color);
    cursor: not-allowed;
}
</style>
