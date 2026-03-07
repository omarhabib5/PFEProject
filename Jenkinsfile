pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        // Backend Configuration
        BACKEND_SOLUTION = 'backend/backend.sln'
        BACKEND_PROJECT = 'backend/Projet.Api/Projet.Api.csproj'
        
        // Frontend Configuration
        FRONTEND_DIR = 'Frontend/webApp'
        
        // Docker Configuration
        IMAGE_NAME_BACKEND = 'pfe-backend'
        IMAGE_NAME_FRONTEND = 'pfe-frontend'
        IMAGE_TAG = "${BUILD_NUMBER}"
        
        // Database Configuration
        MSSQL_DB = 'ProjetPFE'
        
        // API Configuration
        ASPNETCORE_ENVIRONMENT = 'Production'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    echo "✓ Checked out code from branch: ${env.BRANCH_NAME ?: 'unknown'}"
                }
            }
        }

        stage('Analyze Backend') {
            steps {
                script {
                    echo "📊 Analyzing Backend Code..."
                    dir('backend') {
                        bat '''
                            @echo off
                            echo Checking .NET version
                            dotnet --version
                            
                            echo Listing project structure
                            dir /s /b *.csproj
                        '''
                    }
                }
            }
        }

        stage('Build Backend') {
            steps {
                script {
                    echo "🔨 Building Backend (.NET)..."
                    dir('backend') {
                        bat '''
                            @echo off
                            echo Restoring NuGet packages
                            dotnet restore %BACKEND_SOLUTION%
                            
                            echo Building solution
                            dotnet build %BACKEND_SOLUTION% --configuration Release --no-restore
                        '''
                    }
                }
            }
        }

        stage('Test Backend') {
            steps {
                script {
                    echo "🧪 Running Backend Tests..."
                    dir('backend') {
                        bat '''
                            @echo off
                            echo Running unit tests
                            dotnet test %BACKEND_SOLUTION% --configuration Release --no-build --verbosity normal --logger "trx;LogFileName=test-results.trx"
                        '''
                    }
                }
            }
            post {
                always {
                    junit 'backend/**/test-results.trx'
                }
            }
        }

        stage('Analyze Frontend') {
            steps {
                script {
                    echo "📊 Analyzing Frontend Code..."
                    dir(env.FRONTEND_DIR) {
                        bat '''
                            @echo off
                            echo Checking Node and npm versions
                            node --version
                            npm --version
                            
                            echo Checking package.json
                            type package.json | findstr "\"name\"|\"version\""
                        '''
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                script {
                    echo "🔨 Building Frontend (Angular)..."
                    dir(env.FRONTEND_DIR) {
                        bat '''
                            @echo off
                            echo Installing dependencies
                            call npm ci
                            
                            echo Building Angular application
                            call npm run build
                        '''
                    }
                }
            }
        }

        stage('Test Frontend') {
            steps {
                script {
                    echo "🧪 Running Frontend Tests..."
                    dir(env.FRONTEND_DIR) {
                        bat '''
                            @echo off
                            echo Running Angular tests
                            call npm run test -- --watch=false --code-coverage
                        '''
                    }
                }
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: "${env.FRONTEND_DIR}/coverage",
                        reportFiles: 'index.html',
                        reportName: 'Angular Coverage Report'
                    ])
                }
            }
        }

        stage('SonarQube Analysis') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "📈 Running SonarQube Analysis..."
                    withSonarQubeEnv('SonarQube') {
                        bat '''
                            @echo off
                            echo Analyzing code quality with SonarQube
                            dotnet sonarscanner begin /k:"PFEProject" /d:sonar.host.url=http://sonarqube:9000
                            dotnet build backend/backend.sln --configuration Release
                            dotnet sonarscanner end
                        '''
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    echo "🐳 Building Docker Images..."
                    bat '''
                        @echo off
                        echo Building Backend Docker image
                        docker build -f backend/Projet.Api/Dockerfile -t %IMAGE_NAME_BACKEND%:%IMAGE_TAG% .
                        docker tag %IMAGE_NAME_BACKEND%:%IMAGE_TAG% %IMAGE_NAME_BACKEND%:latest
                        
                        echo Building Frontend Docker image
                        docker build -f Frontend/webApp/Dockerfile -t %IMAGE_NAME_FRONTEND%:%IMAGE_TAG% Frontend/webApp
                        docker tag %IMAGE_NAME_FRONTEND%:%IMAGE_TAG% %IMAGE_NAME_FRONTEND%:latest
                    '''
                }
            }
        }

        stage('Docker Compose Test') {
            steps {
                script {
                    echo "🔍 Testing with Docker Compose..."
                    bat '''
                        @echo off
                        echo Starting services with docker-compose
                        docker-compose -f docker-compose.yml up -d
                        
                        echo Waiting for services to be healthy
                        timeout /t 30
                        
                        echo Checking service status
                        docker-compose ps
                        
                        echo Testing Backend API
                        curl -i http://localhost:7219/swagger/ui
                        
                        echo Stopping services
                        docker-compose down
                    '''
                }
            }
            post {
                always {
                    bat 'docker-compose down --volumes || exit /b 0'
                }
            }
        }

        stage('Push Docker Images') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "📤 Pushing Docker Images..."
                    echo "⚠️ Skipping Docker Registry push - credentials not configured"
                    // Uncomment when credentials are available:
                    // withCredentials([usernamePassword(credentialsId: 'docker-registry-credentials', 
                    //                                   usernameVariable: 'DOCKER_USER', 
                    //                                   passwordVariable: 'DOCKER_PASS')]) {
                    //     bat '''
                    //         @echo off
                    //         echo Logging into Docker Registry
                    //         echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin
                    //         
                    //         echo Tagging images with registry
                    //         docker tag %IMAGE_NAME_BACKEND%:%IMAGE_TAG% %DOCKER_USER%/%IMAGE_NAME_BACKEND%:%IMAGE_TAG%
                    //         docker tag %IMAGE_NAME_FRONTEND%:%IMAGE_TAG% %DOCKER_USER%/%IMAGE_NAME_FRONTEND%:%IMAGE_TAG%
                    //         
                    //         echo Pushing images to registry
                    //         docker push %DOCKER_USER%/%IMAGE_NAME_BACKEND%:%IMAGE_TAG%
                    //         docker push %DOCKER_USER%/%IMAGE_NAME_FRONTEND%:%IMAGE_TAG%
                    //         
                    //         echo Logging out
                    //         docker logout
                    //     '''
                    // }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "🚀 Deploying to Staging Environment..."
                    bat '''
                        @echo off
                        echo Deploying using docker-compose to staging
                        docker-compose -p pfe-staging -f docker-compose.yml up -d
                        
                        echo Verifying deployment
                        docker-compose -p pfe-staging ps
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo "❤️ Performing Health Checks..."
                    bat '''
                        @echo off
                        echo Checking Backend API health
                        for /l %%i in (1,1,10) do (
                            curl -s http://localhost:7219/healthz && goto success
                            timeout /t 5 /nobreak
                        )
                        exit /b 1
                        :success
                        echo ✓ Backend API is healthy
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                echo "📋 Generating Reports..."
                
                // Archive artifacts - with catchError to handle missing files gracefully
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    archiveArtifacts artifacts: 'backend/**/bin/Release/**/*.dll, Frontend/webApp/dist/**', 
                                     allowEmptyArchive: true
                }
                
                // Clean up workspace
                cleanWs()
            }
        }
        
        success {
            script {
                echo "✅ Pipeline succeeded!"
                // You can add notifications here (email, Slack, etc.)
            }
        }
        
        failure {
            script {
                echo "❌ Pipeline failed!"
                // You can add notifications here (email, Slack, etc.)
            }
        }
    }
}
