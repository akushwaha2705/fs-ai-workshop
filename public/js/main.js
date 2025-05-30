// Add token to all fetch requests
function setupFetchInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = function() {
        let [resource, config] = arguments;
        
        // Don't add token for auth endpoints
        if (!resource.includes('/api/auth/')) {
            config = config || {};
            config.headers = config.headers || {};
            const token = localStorage.getItem('token');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return originalFetch(resource, config);
    };
}

// Check token expiration
function checkTokenExpiration() {
    const expiresIn = localStorage.getItem('expires_in');
    const tokenTimestamp = localStorage.getItem('token_timestamp');
    
    if (expiresIn && tokenTimestamp) {
        const expirationTime = parseInt(tokenTimestamp) + (parseInt(expiresIn) * 1000);
        if (Date.now() >= expirationTime) {
            // Token expired, redirect to login
            localStorage.clear();
            window.location.href = '/login';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupFetchInterceptor();
    
    // Store token timestamp if not exists
    if (localStorage.getItem('token') && !localStorage.getItem('token_timestamp')) {
        localStorage.setItem('token_timestamp', Date.now().toString());
    }
    
    // Check token expiration every minute
    setInterval(checkTokenExpiration, 60000);

    const urlForm = document.getElementById('url-form');
    const urlsTable = document.getElementById('urls-table').getElementsByTagName('tbody')[0];

    // Create alert element
    const alert = document.createElement('div');
    alert.className = 'alert';
    document.body.appendChild(alert);

    // Show alert function
    const showAlert = (message, type = 'success') => {
        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.style.display = 'block';
        setTimeout(() => {
            alert.style.display = 'none';
        }, 3000);
    };

    // Handle form submission
    urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = urlForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Shortening...';
        
        const formData = {
            longUrl: urlForm.longUrl.value.trim(),
            customCode: urlForm.customCode.value.trim()
        };

        try {
            console.log('Sending request:', formData);
            const response = await fetch('/api/url/shorten', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            console.log('Received response:', data);
            
            if (response.ok) {
                // Add new row to table
                const row = urlsTable.insertRow(0);
                row.innerHTML = `
                    <td>
                        <a href="${data.shortUrl}" target="_blank">${data.shortUrl}</a>
                        <button class="btn btn-sm btn-outline-primary copy-btn" data-url="${data.shortUrl}">Copy</button>
                    </td>
                    <td>${data.longUrl}</td>
                    <td>0</td>
                    <td>${new Date().toLocaleDateString()}</td>
                `;
                
                // Clear form
                urlForm.reset();
                showAlert('URL shortened successfully!');

                // Add copy functionality to new button
                const copyBtn = row.querySelector('.copy-btn');
                copyBtn.addEventListener('click', copyToClipboard);
            } else {
                showAlert(data.error || 'Failed to shorten URL', 'danger');
            }
        } catch (err) {
            console.error('Error:', err);
            showAlert('An error occurred. Please try again.', 'danger');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Shorten';
        }
    });

    // Copy to clipboard function
    const copyToClipboard = async (e) => {
        const url = e.target.dataset.url;
        try {
            await navigator.clipboard.writeText(url);
            showAlert('URL copied to clipboard!');
        } catch (err) {
            console.error('Copy error:', err);
            showAlert('Failed to copy URL', 'danger');
        }
    };

    // Add copy functionality to existing buttons
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', copyToClipboard);
    });
}); 