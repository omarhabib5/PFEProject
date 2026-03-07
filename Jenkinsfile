pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        // Backend Configuration
        BACKEND_SOLUTION = 'backend.sln'
        BACKEND_PROJECT = 'Projet.Api/Projet.Api.csproj'
        
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
                            echo "Checking .NET version"
                            dotnet --version
                            
                            echo "Listing project structure"
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
                            echo "Restoring NuGet packages"
                            dotnet restore ${BACKEND_SOLUTION}
                            
                            echo "Building solution"
                            dotnet build ${BACKEND_SOLUTION} --configuration Release --no-restore
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
                            echo "Running unit tests"
                            dotnet test ${BACKEND_SOLUTION} --configuration Release --no-build --verbosity normal --logger "trx;LogFileName=test-results.trx" || true
                        '''
                    }
                }
            }
            post {
                always {
                    catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                        script {
                            def hasTrx = sh(script: "find backend -type f -name 'test-results.trx' | grep -q .", returnStatus: true) == 0
                            if (hasTrx) {
                                archiveArtifacts artifacts: 'backend/**/test-results.trx', allowEmptyArchive: true
                                echo "✓ Backend test reports archived"
                            } else {
                                echo "ℹ No backend test report (*.trx) found"
                            }
                        }
                    }
                }
            }
        }

        stage('Analyze Frontend') {
            steps {
                script {
                    echo "📊 Analyzing Frontend Code..."
                    dir("${FRONTEND_DIR}") {
                        sh '''
                            echo "Checking Node and npm versions"
                            node --version
                            npm --version
                            
                            echo "Checking package.json"
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
                    dir("${FRONTEND_DIR}") {
                        sh '''
                            echo "Installing dependencies"
                            npm ci
                            
                            echo "Building Angular application"
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
                    dir("${FRONTEND_DIR}") {
                        sh '''
                            echo "Running Angular tests"
                            npm run test -- --watch=false || true
                        '''
                    }
                }
            }
            post {
                always {
                    catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                        script {
                            if (fileExists('Frontend/webApp/coverage/index.html')) {
                                publishHTML([
                                    allowMissing: true,
                                    alwaysLinkToLastBuild: true,
                                    keepAll: true,
                                    reportDir: "Frontend/webApp/coverage",
                                    reportFiles: 'index.html',
                                    reportName: 'Angular Coverage Report'
                                ])
                            } else if (fileExists('Frontend/webApp/coverage/web-app/index.html')) {
                                publishHTML([
                                    allowMissing: true,
                                    alwaysLinkToLastBuild: true,
                                    keepAll: true,
                                    reportDir: "Frontend/webApp/coverage/web-app",
                                    reportFiles: 'index.html',
                                    reportName: 'Angular Coverage Report'
                                ])
                            } else {
                                echo "ℹ No frontend coverage report found"
                            }
                        }
                    }
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
                        dir('backend') {
                            sh '''
                                echo "Analyzing code quality with SonarQube"
                                dotnet sonarscanner begin /k:"PFEProject" /d:sonar.host.url=http://sonarqube:9000
                                dotnet build ${BACKEND_SOLUTION} --configuration Release
                                dotnet sonarscanner end
                            '''
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    echo "🐳 Building Docker Images..."
                    sh '''
                        echo "Building Backend Docker image"
                        docker build -f backend/Projet.Api/Dockerfile -t ${IMAGE_NAME_BACKEND}:${IMAGE_TAG} backend
                        docker tag ${IMAGE_NAME_BACKEND}:${IMAGE_TAG} ${IMAGE_NAME_BACKEND}:latest
                        
                        echo "Building Frontend Docker image"
                        docker build -f Frontend/webApp/Dockerfile -t ${IMAGE_NAME_FRONTEND}:${IMAGE_TAG} Frontend/webApp
                        docker tag ${IMAGE_NAME_FRONTEND}:${IMAGE_TAG} ${IMAGE_NAME_FRONTEND}:latest
                    '''
                }
            }
        }

        stage('Docker Compose Test') {
            steps {
                script {
                    echo "🔍 Testing with Docker Compose..."
                    sh '''
                        echo "Cleaning conflicting containers if they already exist"
                        docker rm -f pfe-db pfe-backend pfe-frontend || true

                        echo "Starting services with docker-compose"
                        docker-compose -p pfe-ci-${BUILD_NUMBER} -f docker-compose.yml up -d
                        
                        echo "Waiting for services to be healthy"
                        sleep 30
                        
                        echo "Checking service status"
                        docker-compose -p pfe-ci-${BUILD_NUMBER} -f docker-compose.yml ps
                        
                        echo "Testing Backend API"
                        curl -i http://localhost:7219/swagger/index.html || true
                        
                        echo "Stopping services"
                        docker-compose -p pfe-ci-${BUILD_NUMBER} -f docker-compose.yml down
                    '''
                }
            }
            post {
                always {
                    sh 'docker-compose -p pfe-ci-${BUILD_NUMBER} -f docker-compose.yml down --volumes || true'
                    sh 'docker rm -f pfe-db pfe-backend pfe-frontend || true'
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
                        echo "Deploying using docker-compose to staging"
                        docker-compose -p pfe-staging -f docker-compose.yml up -d
                        
                        echo "Verifying deployment"
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
                        echo "Checking Backend API health"
                        for i in $(seq 1 10); do
                            if curl -s http://localhost:7219/healthz; then
                                echo "✓ Backend API is healthy"
                                exit 0
                            fi
                            sleep 5
                        done
                        echo "⚠️ Health check timed out"
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
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    archiveArtifacts artifacts: 'backend/**/bin/Release/**/*.dll, Frontend/webApp/dist/**',
                                     allowEmptyArchive: true
                }
                cleanWs()
            }
        }
        success {
            script {
                echo "✅ Pipeline succeeded!"
            }
        }
        failure {
            script {
                echo "❌ Pipeline failed!"
            }
        }
    }
}