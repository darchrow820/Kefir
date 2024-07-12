import {useState, useEffect} from "react";
import "./App.css";
import getCommentsRequest from "src/api/comments/getCommentsRequest";
import getAuthorsRequest from "src/api/authors/getAuthorsRequest";
import comment_header_like from "src/assets/icons/comment_header_like.png";
import comment_like_empty from "src/assets/icons/comment_like_empty.png";
import comment_like_full from "src/assets/icons/comment_like_full.png";

function App() {
    type Comment = {
        pagination: {
            page: number;
            size: number;
            total_pages: number;
        };
        data: Data[];
    };

    type Data = {
        id: number;
        created: string;
        text: string;
        author: number;
        parent: string | null;
        likes: number;
    };

    type Authors = {
        [key: number]: {
            avatar: string;
            id: number;
            name: string;
        };
    };

    const [comments, setComments] = useState<Comment>({
        pagination: {
            page: 1,
            size: 0,
            total_pages: 0,
        },
        data: [],
    });

    const [authors, setAuthors] = useState<Authors>({
        0: {
            avatar: "",
            id: 0,
            name: "",
        },
    });

    const [totalComments, setTotalComments] = useState(0);
    const [totalLikes, setTotalLikes] = useState(0);
    const [likedComments, setLikedComments] = useState<Set<number>>(new Set());

    const [currentPage, setCurrentPage] = useState(0);

    const fetchPageData = async (page: number) => {
        const totalPages = 3;
        let retryCount = 0;
        const maxRetries = 3;

        try {
            const response = await getCommentsRequest(page);
            const accumulatedComments = [...comments.data, ...response.data];
            setCurrentPage((currentPage) => currentPage + 1);
            setComments({
                pagination: {
                    page: 1,
                    size: accumulatedComments.length,
                    total_pages: totalPages,
                },
                data: accumulatedComments,
            });
        } catch (error) {
            console.error("Ошибка при получении данных:", error);
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(
                    `Повторная попытка получения данных. Попытка № ${retryCount}`,
                );
            } else {
                console.log(
                    "Достигнуто максимальное количество попыток. Не удалось загрузить данные.",
                );
            }
        }
    };

    useEffect(() => {
        fetchPageData(1);
    }, []);

    useEffect(() => {
        const fetchAuthors = async () => {
            try {
                const authorsData = await getAuthorsRequest();
                setAuthors(authorsData);
            } catch (error) {
                console.error("Не удалось загрузить авторов:", error);
            }
        };

        fetchAuthors();
    }, []);

    const organizeComments = (comments: any) => {
        const commentMap = new Map();
        const commentTree: any[] = [];

        comments.forEach((comment: any) => {
            commentMap.set(comment.id, comment);
            comment.children = [];
        });

        comments.forEach((comment: any) => {
            if (comment.parent && commentMap.has(comment.parent)) {
                const parentComment = commentMap.get(comment.parent);
                if (parentComment) {
                    parentComment.children.push(comment);
                } else {
                    commentTree.push(comment);
                }
            } else {
                commentTree.push(comment);
            }
        });

        return commentTree;
    };

    useEffect(() => {
        const countTotalComments = () => {
            const total = comments.data.length;
            setTotalComments(total);
        };

        const countTotalLikes = () => {
            const total = comments.data.reduce(
                (sum, comment) => sum + comment.likes,
                0,
            );
            const totalTotal = total + likedComments.size;
            setTotalLikes(totalTotal);
        };

        countTotalComments();
        countTotalLikes();
    }, [comments.data, likedComments]);

    const handleLike = (commentId: number) => {
        return (event: React.MouseEvent<HTMLButtonElement>) => {
            setLikedComments((prevLikedComments) => {
                const newLikedComments = new Set(prevLikedComments);
                if (newLikedComments.has(commentId)) {
                    newLikedComments.delete(commentId);
                } else {
                    newLikedComments.add(commentId);
                }

                return newLikedComments;
            });
        };
    };

    const renderNestedComments = (comments: any) => {
        return comments.map((comment: any) => (
            <div key={comment.id} className="comment__tree">
                <div className="comment">
                    <div className="comment__avatar-wrap">
                        <img src={authors[comment.author - 1].avatar} alt="" />
                    </div>
                    <div className="comment__content">
                        <div className="comment__content-header">
                            <p className="name">
                                {authors[comment.author - 1].name}
                            </p>
                            <p className="created">
                                {new Date(comment.created).toLocaleDateString(
                                    "ru-RU",
                                    {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    },
                                )}
                            </p>
                            <button
                                className="likes__wrap"
                                onClick={handleLike(comment.id)}
                            >
                                <img
                                    src={
                                        likedComments.has(comment.id)
                                            ? comment_like_full
                                            : comment_like_empty
                                    }
                                    alt=""
                                />
                                <p>{comment.likes}</p>
                            </button>
                        </div>
                        <div className="comment__content-body">
                            <p className="text">{comment.text}</p>
                        </div>
                    </div>
                </div>
                {comment.children.length > 0 &&
                    renderNestedComments(comment.children)}
            </div>
        ));
    };

    return (
        <div className="App">
            <div className="comments__header">
                <p>{totalComments} комментарев</p>
                <div>
                    <img src={comment_header_like} alt="" />
                    <p>{totalLikes}</p>
                </div>
            </div>
            <div className="comments__wrap">
                {renderNestedComments(organizeComments(comments.data))}
            </div>
            <button
                className="loadMoreButton"
                onClick={() => fetchPageData(currentPage)}
            >
                Загрузить еще
            </button>
        </div>
    );
}

export default App;
