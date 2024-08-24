<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const commits = ref([]);
const repositories = ref([]);
const errorMessage = ref('');
const successMessage = ref('');
const searchQuery = ref('');
const apiUrl = import.meta.env.VITE_API_URL;

const route = useRoute();
const router = useRouter();

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
            errorMessage.value = 'Failed to retrieve commits.';
        }
    } catch (error) {
        errorMessage.value = error.message;
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
    <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">Commit History</h1>

        <div class="mb-4">
            <Button label="Go Back to Repositories" icon="pi pi-arrow-left" class="p-button-secondary" @click="goBack" />
        </div>

        <div class="flex justify-between items-center mb-4">
            <div class="w-full max-w-xs">
                <InputText v-model="searchQuery" placeholder="Search by author or message" class="w-full" />
            </div>
        </div>

        <div class="flex flex-col gap-4 mb-4" style="min-height: 50px">
            <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
            <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        </div>

        <div class="card mt-6">
            <div class="font-semibold text-xl mb-4">Commits List ({{ computedCommits.length !== 0 ? (route.params.id ? computedCommits.length : 'Recent 20') : 'No commits found' }})</div>

            <DataTable :value="computedCommits" scrollable scrollHeight="400px" class="mt-6">
                <!-- Display the last 7 characters of the SHA with a link to the commit URL -->
                <template>
                    <Column field="sha" header="SHA" style="min-width: 250px">
                        <template #body="{ data }">
                            <div class="flex items-center">
                                <span class="mr-2">{{ data.shortSha }}</span>
                                <a :href="data.commitUrl" target="_blank" class="text-blue-500 underline">
                                    <i class="pi pi-external-link" />
                                </a>
                            </div>
                        </template>
                    </Column>
                </template>
                <Column field="repositoryName" header="Repository" style="min-width: 250px"></Column>

                <Column field="author" header="Author" style="min-width: 150px"></Column>
                <Column field="message" header="Message" style="min-width: 300px"></Column>
                <Column field="date" header="Date" style="min-width: 200px"></Column>

                <!-- Additions with success tag -->
                <Column field="additions" header="Additions" style="min-width: 150px">
                    <template #body="{ data }">
                        <Tag icon="pi pi-check" severity="success" :value="data.additions" class="w-full text-center">
                            <div class="flex justify-start items-center w-full">
                                <span class="flex-grow text-center">{{ data.additions }}</span>
                            </div>
                        </Tag>
                    </template>
                </Column>

                <!-- Deletions with danger tag -->
                <Column field="deletions" header="Deletions" style="min-width: 150px">
                    <template #body="{ data }">
                        <Tag icon="pi pi-times" severity="danger" :value="data.deletions" class="w-full text-center">
                            <div class="flex justify-start items-center w-full">
                                <span class="flex-grow text-center">{{ data.deletions }}</span>
                            </div>
                        </Tag>
                    </template>
                </Column>

                <!-- Total Changes with info tag -->
                <Column field="total" header="Total Changes" style="min-width: 150px">
                    <template #body="{ data }">
                        <Tag icon="pi pi-info-circle" severity="info" :value="data.total" class="w-full text-center">
                            <div class="flex justify-start items-center w-full">
                                <span class="flex-grow text-center">{{ data.total }}</span>
                            </div>
                        </Tag>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
