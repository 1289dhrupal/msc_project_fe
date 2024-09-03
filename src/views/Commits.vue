<script setup>
import { useLayout } from '@/layout/composables/layout';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const commits = ref([]);
const repositories = ref([]);
const searchQuery = ref('');

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const apiUrl = import.meta.env.VITE_API_URL;
const fileTypeChartData = ref({});
const fileChangesChartData = ref({});
const pieOptions = ref({});

const commitStatsDialog = ref(false);
const commitStats = ref(null); // Initialize as null
const selectedCommitId = ref(null);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const dt = ref(null); // Reference for the DataTable

const fetchCommits = async (repositoryId = null) => {
    try {
        let endpointUrl = `${apiUrl}/git/commits`;
        if (repositoryId) {
            endpointUrl = `${apiUrl}/git/repositories/${repositoryId}/commits`;
        }

        const response = await fetch(endpointUrl, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
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

const fetchCommitStats = async (id) => {
    try {
        const response = await fetch(`${apiUrl}/git/commits/${id}/stats`, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch commit stats');

        const data = await response.json();
        if (data.success) {
            commitStats.value = data.data;
            prepareChartData();
            commitStatsDialog.value = true;
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to fetch commit stats.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const prepareChartData = () => {
    // Prepare data for the pie charts
    const extensionCounts = {};
    const extensionChanges = {};

    commitStats.value.files.forEach((file) => {
        const ext = file.extension || 'Unknown';
        if (!extensionCounts[ext]) {
            extensionCounts[ext] = 0;
            extensionChanges[ext] = 0;
        }
        extensionCounts[ext]++;
        extensionChanges[ext] += file.total;
    });

    const documentStyle = getComputedStyle(document.documentElement);
    const chartColors = [
        documentStyle.getPropertyValue('--p-primary-500'),
        documentStyle.getPropertyValue('--p-teal-500'),
        documentStyle.getPropertyValue('--p-purple-500'),
        documentStyle.getPropertyValue('--p-orange-500'),
        documentStyle.getPropertyValue('--p-indigo-500'),
        documentStyle.getPropertyValue('--p-cyan-500')
    ];

    fileTypeChartData.value = {
        labels: Object.keys(extensionCounts),
        datasets: [
            {
                data: Object.values(extensionCounts),
                backgroundColor: chartColors,
                hoverBackgroundColor: chartColors
            }
        ]
    };

    fileChangesChartData.value = {
        labels: Object.keys(extensionChanges),
        datasets: [
            {
                data: Object.values(extensionChanges),
                backgroundColor: chartColors,
                hoverBackgroundColor: chartColors
            }
        ]
    };

    pieOptions.value = {
        plugins: {
            legend: {
                labels: {
                    color: documentStyle.getPropertyValue('--text-color')
                }
            }
        },
        maintainAspectRatio: false,
        aspectRatio: 1.2
    };
};

const openStatsDialog = (id) => {
    selectedCommitId.value = id;
    fetchCommitStats(id);
};

const filteredCommits = computed(() => {
    if (!searchQuery.value) return commits.value;
    return commits.value.filter((commit) => commit.author.toLowerCase().includes(searchQuery.value.toLowerCase()) || commit.message.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

const computedCommits = computed(() => {
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

watch([getPrimary, getSurface, isDarkTheme], () => {
    prepareChartData(); // Pass the documentStyle to reinitialize the charts
});

const goBack = () => {
    router.push('/repositories');
};

onMounted(() => {
    fetchCommits(route.params.id);
});
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
                    <Select v-model="selectedTokenId" :options="gitTokens" optionLabel="token" placeholder="Select a Token to filter repositories" class="w-full" @change="onTokenSelect" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
                </template>
            </Toolbar>

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
                            <Button icon="pi pi-chart-line" class="mr-1" v-tooltip="{ value: 'View Analysis', hideDelay: 100 }" outlined rounded severity="info" @click="openStatsDialog(slotProps.data.id)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>

    <Dialog v-model:visible="commitStatsDialog" :style="{ width: '75vw', backgroundColor: 'var(--surface-ground)' }" header="Commit Analysis" :modal="true">
        <div v-if="commitStats" class="grid grid-cols-12 gap-8">
            <!-- Commit Message -->
            <div class="col-span-12">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Commit Message</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ commitStats.message }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-comment text-blue-500 !text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Author -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Author</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ commitStats.author }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-user text-blue-500 !text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Date -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Date</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ commitStats.date }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-calendar text-blue-500 !text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Additions -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Additions</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ commitStats.additions }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-plus text-green-500 !text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Deletions -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Deletions</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ commitStats.deletions }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-red-100 dark:bg-red-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-minus text-red-500 !text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Number of Comment Lines -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Number of Comment Lines</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ commitStats.number_of_comment_lines }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-comment text-purple-500 !text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Commit Changes Quality Score -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Commit Changes Quality Score</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ commitStats.commit_changes_quality_score }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-star text-orange-500 !text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Commit Message Quality Score -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Commit Message Quality Score</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ commitStats.commit_message_quality_score }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-yellow-100 dark:bg-yellow-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-info-circle text-yellow-500 !text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Commit SHA -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Commit SHA</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ commitStats.sha.slice(0, 7) }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-github text-blue-500 !text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pie Chart for Number of File Types per Extension -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-6">
                <div class="card">
                    <h3 class="font-semibold text-xl mb-4">File Types by Extension</h3>
                    <Chart type="pie" :data="fileTypeChartData" :options="pieOptions" class="h-[20rem]" />
                </div>
            </div>

            <!-- Pie Chart for Total Changes per Extension -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-6">
                <div class="card">
                    <h3 class="font-semibold text-xl mb-4">Total Changes by Extension</h3>
                    <Chart type="pie" :data="fileChangesChartData" :options="pieOptions" class="h-[20rem]" />
                </div>
            </div>
        </div>

        <h3 v-if="commitStats.files.length" class="mt-4 mb-2">Files in this Commit:</h3>
        <DataTable v-if="commitStats.files.length" :value="commitStats.files" scrollable paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown" :rows="10" :paginator="true">
            <template #header>
                <div class="flex flex-wrap gap-2 items-center justify-between">
                    <div class="font-semibold text-xl mb-4">Files List ({{ commitStats.files.length !== 0 ? commitStats.files.length : 'No files found' }})</div>
                </div>
            </template>

            <Column field="filename" header="Filename" sortable style="min-width: 200px"></Column>
            <Column field="extension" header="Extension" sortable style="min-width: 150px"></Column>
            <Column field="status" header="Status" sortable style="min-width: 150px"></Column>
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
            <Column field="total" header="Total Changes" sortable style="min-width: 150px">
                <template #body="slotProps">
                    <Tag icon="pi pi-info-circle" severity="info" :value="slotProps.data.total" class="w-full">
                        <span class="flex-grow text-center">{{ slotProps.data.total }}</span>
                    </Tag>
                </template>
            </Column>
        </DataTable>
    </Dialog>
</template>
