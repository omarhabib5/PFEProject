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
                        sh '''
                            echo Checking .NET version
                            dotnet --version
                            
                            echo Listing project structure
                            find . -name "*.csproj" -type f
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
                        sh '''
                            echo Restoring NuGet packages
                            dotnet restore $BACKEND_SOLUTION
                            
                            echo Building solution
                            dotnet build $BACKEND_SOLUTION --configuration Release --no-restore
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
                        sh '''
                            echo Running unit tests
                            dotnet test $BACKEND_SOLUTION --configuration Release --no-build --verbosity normal --logger "trx;LogFileName=test-results.trx"
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
                        sh '''
                            echo Checking Node and npm versions
                            node --version
                            npm --version
                            
                            echo Checking package.json
                            grep -E '"name"|"version"' package.json
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
                        sh '''
                            echo Installing dependencies
                            npm ci
                            
                            echo Building Angular application
                            npm run build
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
                        sh '''
                            echo Running Angular tests
                            npm run test -- --watch=false --code-coverage
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
                        sh '''
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
                    sh '''
                        echo Building Backend Docker image
                        docker build -f backend/Projet.Api/Dockerfile -t $IMAGE_NAME_BACKEND:$IMAGE_TAG .
                        docker tag $IMAGE_NAME_BACKEND:$IMAGE_TAG $IMAGE_NAME_BACKEND:latest
                        
                        echo Building Frontend Docker image
                        docker build -f Frontend/webApp/Dockerfile -t $IMAGE_NAME_FRONTEND:$IMAGE_TAG Frontend/webApp
                        docker tag $IMAGE_NAME_FRONTEND:$IMAGE_TAG $IMAGE_NAME_FRONTEND:latest
                    '''
                }
            }
        }

        stage('Docker Compose Test') {
            steps {
                script {
                    echo "🔍 Testing with Docker Compose..."
                    sh '''
                        echo Starting services with docker-compose
                        docker-compose -f docker-compose.yml up -d
                        
                        echo Waiting for services to be healthy
                        sleep 30
                        
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
                    sh 'docker-compose down --volumes || true'
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
                    sh '''
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
                    sh '''
                        echo Checking Backend API health
                        for i in {1..10}; do
                            if curl -s http://localhost:7219/healthz; then
                                echo "✓ Backend API is healthy"
                                exit 0
                            fi
                            sleep 5
                        done
                        exit 1
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
