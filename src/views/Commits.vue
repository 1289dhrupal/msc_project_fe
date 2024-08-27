<script setup>
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const commits = ref([]);
const repositories = ref([]);
const searchQuery = ref('');
const apiUrl = import.meta.env.VITE_API_URL;

const route = useRoute();
const router = useRouter();
const toast = useToast();
const dt = ref(null); // Reference for the DataTable

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const fetchCommits = async (repositoryId) => {
    try {
        let endpointUrl = `${apiUrl}/git/commits`;
        if (repositoryId) {
            endpointUrl = `${apiUrl}/git/repositories/${repositoryId}/commits`;
        }

        const response = await fetch(endpointUrl, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch commits');

        const data = await response.json();
        if (data.success) {
            commits.value = data.data.commits;
            repositories.value = data.data.repositories;
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to retrieve commits.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

onMounted(() => {
    fetchCommits(route.params.id);
});

const filteredCommits = computed(() => {
    if (!searchQuery.value) return commits.value;
    return commits.value.filter((commit) => commit.author.toLowerCase().includes(searchQuery.value.toLowerCase()) || commit.message.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

const computedCommits = computed(() => {
    // Create a map of repositories keyed by their ID for easy lookup
    const repositoryMap = commits.value.reduce((map, commit) => {
        map[commit.repository_id] = repositories.value.find((repo) => repo.id === commit.repository_id);
        return map;
    }, {});

    return filteredCommits.value.map((commit) => {
        const repository = repositoryMap[commit.repository_id];
        return {
            ...commit,
            shortSha: commit.sha.slice(-7),
            repositoryName: repository ? `${repository.owner}/${repository.name}` : '',
            commitUrl: repository ? `${repository.url}/commit/${commit.sha}` : ''
        };
    });
});

const exportCSV = () => {
    dt.value.exportCSV();
};

watch(route, (newRoute) => {
    if (!newRoute.query.git_token_id) {
        fetchCommits();
    }
});

const goBack = () => {
    router.push('/repositories');
};
</script>

<template>
    <div class="pt-4">
        <h1 class="text-2xl font-bold mb-4">List of Recent Commits</h1>

        <div class="mb-4">
            <Button label="Go Back to Repositories" icon="pi pi-arrow-left" class="p-button-secondary" @click="goBack" />
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

            <!-- :exportFunction="customExportFunction" -->
            <DataTable
                ref="dt"
                :value="computedCommits"
                :exportFilename="`commits_${new Date().getTime()}`"
                :paginator="true"
                :rows="10"
                :filters="filters"
                scrollable
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} commits"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <div class="font-semibold text-xl mb-4">Commits List ({{ computedCommits.length !== 0 ? computedCommits.length : 'No commits found' }})</div>
                        <InputText v-model="filters['global'].value" placeholder="Search..." />
                    </div>
                </template>

                <!-- Display the last 7 characters of the SHA with a link to the commit URL -->
                <Column field="sha" header="SHA" sortable style="min-width: 200px">
                    <template #body="slotProps">
                        <div class="flex items-center">
                            <span class="mr-2">{{ slotProps.data.shortSha }}</span>
                            <a :href="slotProps.data.commitUrl" target="_blank" class="text-blue-500 underline">
                                <i class="pi pi-external-link" />
                            </a>
                        </div>
                    </template>
                </Column>

                <Column field="repositoryName" header="Repository" sortable style="min-width: 250px"></Column>
                <Column field="author" header="Author" sortable style="min-width: 150px"></Column>
                <Column field="message" header="Message" sortable style="min-width: 300px"></Column>
                <Column field="date" header="Date" sortable style="min-width: 200px"></Column>
                <Column field="additions" header="Additions" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <Tag icon="pi pi-check" severity="success" :value="slotProps.data.additions" class="w-full">
                            <span class="flex-grow text-center">{{ slotProps.data.additions }}</span>
                        </Tag>
                    </template>
                </Column>
                <Column field="deletions" header="Deletions" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <Tag icon="pi pi-times" severity="danger" :value="slotProps.data.deletions" class="w-full">
                            <span class="flex-grow text-center">{{ slotProps.data.deletions }}</span>
                        </Tag>
                    </template>
                </Column>
                <Column field="total" header="Total" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <Tag icon="pi pi-info-circle" severity="info" :value="slotProps.data.total" class="w-full">
                            <span class="flex-grow text-center">{{ slotProps.data.total }}</span>
                        </Tag>
                    </template>
                </Column>
                <Column header="Actions" :exportable="false" alignFrozen="right" frozen style="min-width: 150px">
                    <template #body="slotProps">
                        <div class="flex items-center">
                            <Button icon="pi pi-chart-line" class="mr-1" v-tooltip="{ value: 'View Analysis', hideDelay: 100 }" outlined rounded severity="info" @click="openConfirmation(slotProps.data.id)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
