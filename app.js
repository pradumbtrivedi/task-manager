// ============ STATE MANAGEMENT ============

let currentUser = null;
let currentProject = null;
let authToken = localStorage.getItem('authToken');
let projects = [];
let tasks = [];

const API_BASE_URL = 'http://localhost:5000/api';

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    
    if (authToken) {
        showApp();
        loadProjects();
        loadStats();
    } else {
        showAuthContainer();
    }
});

// ============ EVENT LISTENERS ============

function initializeEventListeners() {
    // Auth forms
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement')?.addEventListener('submit', handleRegister);
    
    // Project modals
    document.getElementById('newProjectForm')?.addEventListener('submit', handleCreateProject);
    document.getElementById('editProjectForm')?.addEventListener('submit', handleUpdateProject);
    
    // Task modals
    document.getElementById('newTaskForm')?.addEventListener('submit', handleCreateTask);
    document.getElementById('editTaskForm')?.addEventListener('submit', handleUpdateTask);
    
    // Password strength checker
    document.getElementById('registerPassword')?.addEventListener('input', checkPasswordStrength);
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
        }
    });
}

// ============ AUTHENTICATION ============

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!validateEmail(email)) {
        showAlert('Please enter a valid email', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showAlert(data.error || 'Login failed', 'error');
            return;
        }
        
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        showAlert('Login successful!', 'success');
        showApp();
        loadProjects();
        loadStats();
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred during login', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!username || !email || !password || !confirmPassword) {
        showAlert('All fields are required', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAlert('Please enter a valid email', 'error');
        return;
    }
    
    if (password.length < 8) {
        showAlert('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    if (!validatePasswordStrength(password)) {
        showAlert('Password must contain uppercase, lowercase, number, and special character', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, confirmPassword }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showAlert(data.error || 'Registration failed', 'error');
            return;
        }
        
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        showAlert('Registration successful!', 'success');
        showApp();
        loadProjects();
        loadStats();
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('An error occurred during registration', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    currentProject = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    document.getElementById('loginFormElement').reset();
    document.getElementById('registerFormElement').reset();
    showAuthContainer();
}

// ============ PROJECT MANAGEMENT ============

async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/projects`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        if (!response.ok) throw new Error('Failed to fetch projects');
        
        projects = await response.json();
        renderProjectsList();
    } catch (error) {
        console.error('Error loading projects:', error);
        showAlert('Failed to load projects', 'error');
    }
}

async function handleCreateProject(e) {
    e.preventDefault();
    
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDesc').value.trim();
    
    if (!name) {
        showAlert('Project name is required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ name, description }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showAlert(data.error || 'Failed to create project', 'error');
            return;
        }
        
        projects.push(data);
        renderProjectsList();
        closeModal('newProjectModal');
        document.getElementById('newProjectForm').reset();
        showAlert('Project created successfully!', 'success');
        selectProject(data._id);
    } catch (error) {
        console.error('Error creating project:', error);
        showAlert('Failed to create project', 'error');
    }
}

async function handleUpdateProject(e) {
    e.preventDefault();
    
    if (!currentProject) return;
    
    const name = document.getElementById('editProjectName').value.trim();
    const description = document.getElementById('editProjectDesc').value.trim();
    
    if (!name) {
        showAlert('Project name is required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${currentProject._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ name, description }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showAlert(data.error || 'Failed to update project', 'error');
            return;
        }
        
        currentProject = data;
        const index = projects.findIndex(p => p._id === data._id);
        if (index !== -1) projects[index] = data;
        
        renderProjectsList();
        displayProject(data);
        closeModal('editProjectModal');
        showAlert('Project updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating project:', error);
        showAlert('Failed to update project', 'error');
    }
}

async function deleteProject() {
    if (!currentProject) return;
    
    if (!confirm('Are you sure you want to delete this project and all its tasks?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${currentProject._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        if (!response.ok) throw new Error('Failed to delete project');
        
        projects = projects.filter(p => p._id !== currentProject._id);
        currentProject = null;
        tasks = [];
        
        renderProjectsList();
        showDashboard();
        loadStats();
        showAlert('Project deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting project:', error);
        showAlert('Failed to delete project', 'error');
    }
}

function selectProject(projectId) {
    const project = projects.find(p => p._id === projectId);
    if (project) {
        currentProject = project;
        displayProject(project);
        loadTasks();
    }
}

// ============ TASK MANAGEMENT ============

async function loadTasks() {
    if (!currentProject) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${currentProject._id}/tasks`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        showAlert('Failed to load tasks', 'error');
    }
}

async function handleCreateTask(e) {
    e.preventDefault();
    
    if (!currentProject) return;
    
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDesc').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;
    
    if (!title) {
        showAlert('Task title is required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                title,
                description,
                project: currentProject._id,
                priority,
                dueDate,
            }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showAlert(data.error || 'Failed to create task', 'error');
            return;
        }
        
        tasks.push(data);
        renderTasks();
        closeModal('newTaskModal');
        document.getElementById('newTaskForm').reset();
        loadStats();
        showAlert('Task created successfully!', 'success');
    } catch (error) {
        console.error('Error creating task:', error);
        showAlert('Failed to create task', 'error');
    }
}

async function handleUpdateTask(e) {
    e.preventDefault();
    
    const taskId = e.target.dataset.taskId;
    if (!taskId) return;
    
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDesc').value.trim();
    const status = document.getElementById('editTaskStatus').value;
    const priority = document.getElementById('editTaskPriority').value;
    const dueDate = document.getElementById('editTaskDueDate').value;
    
    if (!title) {
        showAlert('Task title is required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ title, description, status, priority, dueDate }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showAlert(data.error || 'Failed to update task', 'error');
            return;
        }
        
        const index = tasks.findIndex(t => t._id === taskId);
        if (index !== -1) tasks[index] = data;
        
        renderTasks();
        closeModal('editTaskModal');
        loadStats();
        showAlert('Task updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating task:', error);
        showAlert('Failed to update task', 'error');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        
        if (!response.ok) throw new Error('Failed to delete task');
        
        tasks = tasks.filter(t => t._id !== taskId);
        renderTasks();
        loadStats();
        showAlert('Task deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showAlert('Failed to delete task', 'error');
    }
}

// ============ RENDERING FUNCTIONS ============

function renderProjectsList() {
    const projectsList = document.getElementById('projectsList');
    projectsList.innerHTML = '';
    
    projects.forEach(project => {
        const div = document.createElement('div');
        div.className = `project-item ${currentProject?._id === project._id ? 'active' : ''}`;
        div.innerHTML = `
            <strong>${escapeHtml(project.name)}</strong>
            <small>${tasks.filter(t => t.project === project._id).length} tasks</small>
        `;
        div.onclick = () => selectProject(project._id);
        projectsList.appendChild(div);
    });
}

function renderTasks() {
    const pendingTasks = document.getElementById('pendingTasks');
    const inProgressTasks = document.getElementById('inProgressTasks');
    const completedTasksList = document.getElementById('completedTasksList');
    
    pendingTasks.innerHTML = '';
    inProgressTasks.innerHTML = '';
    completedTasksList.innerHTML = '';
    
    tasks.forEach(task => {
        const taskCard = createTaskCard(task);
        
        switch(task.status) {
            case 'pending':
                pendingTasks.appendChild(taskCard);
                break;
            case 'in-progress':
                inProgressTasks.appendChild(taskCard);
                break;
            case 'completed':
                completedTasksList.appendChild(taskCard);
                break;
        }
    });
}

function createTaskCard(task) {
    const div = document.createElement('div');
    div.className = `task-card ${task.priority}`;
    
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
    
    div.innerHTML = `
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
            <span class="task-priority ${task.priority}">${task.priority.toUpperCase()}</span>
            <span class="task-date">${dueDate}</span>
        </div>
        <div class="task-actions">
            <button class="btn btn-secondary" onclick="editTask('${task._id}')">Edit</button>
            <button class="btn btn-danger" onclick="deleteTask('${task._id}')">Delete</button>
        </div>
    `;
    
    return div;
}

function displayProject(project) {
    document.getElementById('projectTitle').textContent = project.name;
    document.getElementById('projectDescription').textContent = project.description || 'No description';
    showView('projectView');
}

// ============ STATISTICS ============

async function loadStats() {
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    
    document.getElementById('totalProjects').textContent = totalProjects;
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
}

// ============ VALIDATION FUNCTIONS ============

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordStrength(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

function checkPasswordStrength(e) {
    const password = e.target.value;
    const strengthDiv = document.getElementById('passwordStrength');
    
    if (!password) {
        strengthDiv.textContent = '';
        return;
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    
    let message = '';
    let className = '';
    
    if (strength < 3) {
        message = 'Weak password';
        className = 'weak';
    } else if (strength < 5) {
        message = 'Medium strength password';
        className = 'medium';
    } else {
        message = 'Strong password';
        className = 'strong';
    }
    
    strengthDiv.textContent = message;
    strengthDiv.className = `password-strength ${className}`;
}

// ============ MODAL FUNCTIONS ============

function showNewProjectModal() {
    document.getElementById('newProjectForm').reset();
    showModal('newProjectModal');
}

function showEditProjectModal() {
    if (!currentProject) return;
    
    document.getElementById('editProjectName').value = currentProject.name;
    document.getElementById('editProjectDesc').value = currentProject.description || '';
    showModal('editProjectModal');
}

function showNewTaskModal() {
    document.getElementById('newTaskForm').reset();
    document.getElementById('newTaskForm').dataset.taskId = '';
    showModal('newTaskModal');
}

function editTask(taskId) {
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;
    
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDesc').value = task.description || '';
    document.getElementById('editTaskStatus').value = task.status;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskDueDate').value = task.dueDate ? task.dueDate.split('T')[0] : '';
    document.getElementById('editTaskForm').dataset.taskId = taskId;
    
    showModal('editTaskModal');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ============ VIEW NAVIGATION ============

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function showDashboard() {
    showView('dashboardView');
}

function showAuthContainer() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    if (currentUser) {
        document.getElementById('userDisplay').textContent = `Welcome, ${currentUser.username}!`;
    }
    
    showDashboard();
}

function switchAuthForm() {
    document.getElementById('loginForm').classList.toggle('active');
    document.getElementById('registerForm').classList.toggle('active');
    document.getElementById('loginFormElement').reset();
    document.getElementById('registerFormElement').reset();
}

// ============ UTILITY FUNCTIONS ============

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showAlert(message, type = 'info') {
    // Simple alert - can be replaced with a toast notification library
    if (type === 'error') {
        console.error(message);
    } else if (type === 'success') {
        console.log('✓', message);
    }
    
    // Optional: Show browser notification
    // alert(message);
}
